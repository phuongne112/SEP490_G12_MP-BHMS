package com.mpbhms.backend.service.impl;

import com.mpbhms.backend.dto.*;
import com.mpbhms.backend.entity.ApiResponse;
import com.mpbhms.backend.entity.Room;
import com.mpbhms.backend.entity.RoomImage;
import com.mpbhms.backend.exception.IdInvalidException;
import com.mpbhms.backend.repository.RoomRepository;
import com.mpbhms.backend.repository.UserRepository;
import com.mpbhms.backend.service.RoomService;
import com.mpbhms.backend.util.SecurityUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import com.mpbhms.backend.enums.RoomStatus;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.beans.factory.annotation.Value;
import com.mpbhms.backend.exception.BusinessException;
import com.mpbhms.backend.exception.ResourceNotFoundException;

import java.io.File;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import java.nio.file.Files;
import java.security.MessageDigest;

@Service
public class RoomServiceImpl implements RoomService {

    @Autowired
    private RoomRepository roomRepository;

    @Autowired
    private UserRepository userRepository;

    @Value("${file.upload-dir}")
    private String uploadDir;

    @Override
    public Room addRoom(AddRoomDTO request, MultipartFile[] images) {
        if (roomRepository.existsByRoomNumber(request.getRoomNumber())) {
            throw new com.mpbhms.backend.exception.BusinessException("Room number duplicated");
        }
        Room room = new Room();
        room.setRoomNumber(request.getRoomNumber());
        room.setArea(request.getArea());
        room.setPricePerMonth(request.getPricePerMonth());
        room.setRoomStatus(RoomStatus.valueOf(request.getRoomStatus()));
        room.setNumberOfBedrooms(request.getNumberOfBedrooms());
        room.setNumberOfBathrooms(request.getNumberOfBathrooms());
        room.setDescription(request.getDescription());
        room.setIsActive(request.getIsActive() != null ? request.getIsActive() : true);
        room.setMaxOccupants(request.getMaxOccupants());
        Long landlordId = SecurityUtil.getCurrentUserId();
        room.setLandlord(userRepository.findById(landlordId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng (landlord)")));
        List<RoomImage> imageEntities = new ArrayList<>();
        if (images != null && images.length > 0) {
            File uploadDirectory = new File(uploadDir);
            if (!uploadDirectory.exists()) {
                uploadDirectory.mkdirs();
            }
            for (MultipartFile file : images) {
                if (!file.isEmpty()) {
                    try {
                        String uploadedFileHash = getFileHash(file);
                        String fileName = null;
                        String imageUrl = null;
                        boolean isDuplicate = false;
                        for (File existingFile : uploadDirectory.listFiles()) {
                            byte[] existingBytes = Files.readAllBytes(existingFile.toPath());
                            String existingHash = bytesToHex(MessageDigest.getInstance("SHA-256").digest(existingBytes));
                            if (existingHash.equalsIgnoreCase(uploadedFileHash)) {
                                isDuplicate = true;
                                fileName = existingFile.getName();
                                imageUrl = "/uploads/" + fileName;
                                break;
                            }
                        }
                        if (!isDuplicate) {
                            fileName = UUID.randomUUID() + "_" + file.getOriginalFilename();
                            File savedFile = new File(uploadDirectory, fileName);
                            file.transferTo(savedFile);
                            imageUrl = "/uploads/" + fileName;
                        }
                        RoomImage img = new RoomImage();
                        img.setImageURL(imageUrl);
                        img.setRoom(room);
                        imageEntities.add(img);
                    } catch (Exception e) {
                        throw new RuntimeException("Lỗi khi lưu file ảnh: " + e.getMessage());
                    }
                }
            }
        }
        room.setImages(imageEntities);
        return roomRepository.save(room);
    }


    @Override
    public ResultPaginationDTO getAllRooms(Specification<Room> spec, Pageable pageable) {
        Page<Room> roomsPage = roomRepository.findAll(spec, pageable);
        List<RoomDTO> roomDTOs = convertToRoomDTOList(roomsPage.getContent());
        Meta meta = new Meta();
        meta.setPage(roomsPage.getNumber() + 1);
        meta.setPageSize(roomsPage.getSize());
        meta.setPages(roomsPage.getTotalPages());
        meta.setTotal(roomsPage.getTotalElements());

        ResultPaginationDTO result = new ResultPaginationDTO();
        result.setMeta(meta);
        result.setResult(roomDTOs); // Trả về list<RoomEntity>

        return result;
    }


    @Override
    public List<RoomDTO> convertToRoomDTOList(List<Room> rooms) {
        return rooms.stream().map(this::convertToRoomDTO).toList();
    }

    public RoomDTO convertToRoomDTO(Room room) {
        RoomDTO dto = new RoomDTO();
        dto.setId(room.getId());
        dto.setRoomNumber(room.getRoomNumber());
        dto.setArea(room.getArea());
        dto.setRoomStatus(room.getRoomStatus() != null ? room.getRoomStatus().name() : null);
        dto.setPricePerMonth(room.getPricePerMonth());
        dto.setNumberOfBedrooms(room.getNumberOfBedrooms());
        dto.setNumberOfBathrooms(room.getNumberOfBathrooms());
        dto.setDescription(room.getDescription());
        dto.setIsActive(room.getIsActive());

        // ✅ Convert landlord (chủ trọ)
        if (room.getLandlord() != null) {
            dto.setLandlordId(room.getLandlord().getId());

            if (room.getLandlord().getUserInfo() != null) {
                dto.setLandlordName(room.getLandlord().getUserInfo().getFullName());
                dto.setLandlordPhone(room.getLandlord().getUserInfo().getPhoneNumber());
            }
        }

        // ✅ Convert images
        List<RoomImageDTO> imageDTOs = room.getImages().stream().map(image -> {
            RoomImageDTO img = new RoomImageDTO();
            img.setId(image.getId());
            img.setImageUrl(image.getImageURL());
            return img;
        }).toList();
        dto.setImages(imageDTOs);

        // ✅ Convert services
        List<ServiceDTO> serviceDTOs = room.getServices().stream().map(service -> {
            ServiceDTO s = new ServiceDTO();
            s.setId(service.getId());
            s.setServiceName(service.getServiceName());
            s.setUnit(service.getUnit());
            s.setUnitPrice(service.getUnitPrice());
            s.setServiceType(service.getServiceType().name());
            return s;
        }).toList();
        dto.setServices(serviceDTOs);

        // ✅ Convert assets
        List<AssetDTO> assetDTOs = room.getAssets().stream().map(asset -> {
            AssetDTO a = new AssetDTO();
            a.setId(asset.getId());
            a.setAssetName(asset.getAssetName());
            a.setQuantity(asset.getQuantity());
            a.setConditionNote(asset.getConditionNote());
            a.setAssetStatus(asset.getAssetStatus().name());
            a.setAssetImage(asset.getAssetImage());
            return a;
        }).toList();
        dto.setAssets(assetDTOs);

        return dto;
    }

    @Override
    public Room updateRoom(Long id, AddRoomDTO request, List<Long> keepImageIds, MultipartFile[] images) {
        Room room = roomRepository.findById(id)
                .orElseThrow(() -> new IdInvalidException("Room với id  không tồn tại."));

        // Cập nhật thông tin phòng
        room.setRoomNumber(request.getRoomNumber());
        room.setArea(request.getArea());
        room.setPricePerMonth(request.getPricePerMonth());
        room.setRoomStatus(RoomStatus.valueOf(request.getRoomStatus()));
        room.setNumberOfBedrooms(request.getNumberOfBedrooms());
        room.setNumberOfBathrooms(request.getNumberOfBathrooms());
        room.setDescription(request.getDescription());
        room.setIsActive(request.getIsActive() != null ? request.getIsActive() : true);
        room.setMaxOccupants(request.getMaxOccupants());

        // Chỉ update ảnh nếu FE gửi keepImageIds hoặc images
        boolean updateImages = (keepImageIds != null && !keepImageIds.isEmpty()) || (images != null && images.length > 0);
        if (updateImages) {
            List<RoomImage> imagesToKeep = new ArrayList<>();
            if (keepImageIds != null && !keepImageIds.isEmpty()) {
                for (RoomImage img : room.getImages()) {
                    if (keepImageIds.contains(img.getId())) {
                        imagesToKeep.add(img);
                    }
                }
            }
            // Thêm ảnh mới (dùng lại logic kiểm tra trùng hash như addRoom)
            if (images != null && images.length > 0) {
                for (MultipartFile file : images) {
                    if (!file.isEmpty()) {
                        try {
                            File uploadDirectory = new File(uploadDir);
                            if (!uploadDirectory.exists()) {
                                uploadDirectory.mkdirs();
                            }
                            String uploadedFileHash = getFileHash(file);
                            String fileName = null;
                            String imageUrl = null;
                            boolean isDuplicate = false;
                            for (File existingFile : uploadDirectory.listFiles()) {
                                byte[] existingBytes = Files.readAllBytes(existingFile.toPath());
                                String existingHash = bytesToHex(MessageDigest.getInstance("SHA-256").digest(existingBytes));
                                if (existingHash.equalsIgnoreCase(uploadedFileHash)) {
                                    isDuplicate = true;
                                    fileName = existingFile.getName();
                                    imageUrl = "/uploads/" + fileName;
                                    break;
                                }
                            }
                            if (!isDuplicate) {
                                fileName = UUID.randomUUID() + "_" + file.getOriginalFilename();
                                File savedFile = new File(uploadDirectory, fileName);
                                file.transferTo(savedFile);
                                imageUrl = "/uploads/" + fileName;
                            }
                            RoomImage img = new RoomImage();
                            img.setImageURL(imageUrl);
                            img.setRoom(room);
                            imagesToKeep.add(img);
                        } catch (IOException e) {
                            throw new RuntimeException("Lỗi khi lưu file ảnh: " + e.getMessage());
                        } catch (Exception e) {
                            throw new RuntimeException("Lỗi khi kiểm tra trùng ảnh: " + e.getMessage());
                        }
                    }
                }
            }
            room.getImages().clear();
            room.getImages().addAll(imagesToKeep);
        }
        return roomRepository.save(room);
    }

    @Override
    public void deleteRoom(Long id) {
      roomRepository.deleteById(id);
    }

    @Override
    public void updateRoomStatus(Long id, String status) {
        Room room = roomRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Room not found with id: " + id));
        try {
            RoomStatus newStatus = RoomStatus.valueOf(status);
            room.setRoomStatus(newStatus);
            roomRepository.save(room);
        } catch (IllegalArgumentException e) {
            throw new BusinessException("Invalid room status: " + status);
        }
    }

    @Override
    public void toggleActiveStatus(Long id) {
        Room room = roomRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Room not found with id: " + id));
        room.setIsActive(!room.getIsActive());
        roomRepository.save(room);
    }

    private String getFileHash(MultipartFile file) throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        byte[] hash = digest.digest(file.getBytes());
        return bytesToHex(hash);
    }

    private String bytesToHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder();
        for (byte b : bytes) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString();
    }

    // Lấy danh sách phòng có người thuê
    public ResultPaginationDTO getAllRoomsWithRenter(Pageable pageable) {
        Page<Room> roomsPage = roomRepository.findByRoomUsersIsNotEmpty(pageable);
        List<RoomDTO> roomDTOs = convertToRoomDTOList(roomsPage.getContent());
        Meta meta = new Meta();
        meta.setPage(roomsPage.getNumber() + 1);
        meta.setPageSize(roomsPage.getSize());
        meta.setPages(roomsPage.getTotalPages());
        meta.setTotal(roomsPage.getTotalElements());

        ResultPaginationDTO result = new ResultPaginationDTO();
        result.setMeta(meta);
        result.setResult(roomDTOs);
        return result;
    }

}
