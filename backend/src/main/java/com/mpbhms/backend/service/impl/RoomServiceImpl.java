package com.mpbhms.backend.service.impl;

import com.mpbhms.backend.dto.*;
import com.mpbhms.backend.entity.ApiResponse;
import com.mpbhms.backend.entity.Room;
import com.mpbhms.backend.entity.RoomImage;
import com.mpbhms.backend.exception.IdInvalidException;
import com.mpbhms.backend.repository.RoomRepository;
import com.mpbhms.backend.repository.UserRepository;
import com.mpbhms.backend.repository.RoomUserRepository;
import com.mpbhms.backend.repository.ContractRepository;
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
import com.mpbhms.backend.enums.ServiceType;
import com.mpbhms.backend.entity.ServiceReading;
import com.mpbhms.backend.repository.ServiceReadingRepository;
import java.math.BigDecimal;
import jakarta.persistence.criteria.Predicate;

import java.io.File;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import java.nio.file.Files;
import java.security.MessageDigest;
import java.util.Optional;
import com.mpbhms.backend.repository.BillDetailRepository;

@Service
public abstract class RoomServiceImpl implements RoomService {

    @Autowired
    private RoomRepository roomRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoomUserRepository roomUserRepository;

    @Autowired
    private ContractRepository contractRepository;

    @Autowired
    private com.mpbhms.backend.repository.ServiceRepository serviceRepository;

    @Autowired
    private BillDetailRepository billDetailRepository;

    @Autowired
    @Value("${file.upload-dir}")
    private String uploadDir;

    @Autowired
    private ServiceReadingRepository serviceReadingRepository;

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

    @Override
    public Room updateRoom(Long id, AddRoomDTO request, List<Long> keepImageIds, MultipartFile[] images) {
        Room room = roomRepository.findByIdAndDeletedFalse(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy phòng với id: " + id));

        // Cập nhật thông tin phòng
        room.setRoomNumber(request.getRoomNumber());
        room.setArea(request.getArea());
        room.setPricePerMonth(request.getPricePerMonth());
        try {
            RoomStatus status = RoomStatus.valueOf(request.getRoomStatus());
            room.setRoomStatus(status);
        } catch (IllegalArgumentException e) {
            throw new BusinessException("Trạng thái phòng không hợp lệ: " + request.getRoomStatus());
        }
        room.setNumberOfBedrooms(request.getNumberOfBedrooms());
        room.setNumberOfBathrooms(request.getNumberOfBathrooms());
        room.setDescription(request.getDescription());
        room.setIsActive(request.getIsActive() != null ? request.getIsActive() : true);
        room.setMaxOccupants(request.getMaxOccupants());
        room.setBuilding(request.getBuilding());

        boolean updateImages = keepImageIds != null || (images != null && images.length > 0);
        if (updateImages) {
            List<RoomImage> imagesToKeep = new ArrayList<>();
            if (keepImageIds != null) {
                for (RoomImage img : room.getImages()) {
                    if (keepImageIds.contains(img.getId())) {
                        imagesToKeep.add(img);
                    }
                }
            }
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
                            File[] existingFiles = uploadDirectory.listFiles();
                            if (existingFiles != null) {
                                for (File existingFile : existingFiles) {
                                    byte[] existingBytes = Files.readAllBytes(existingFile.toPath());
                                    String existingHash = bytesToHex(MessageDigest.getInstance("SHA-256").digest(existingBytes));
                                    if (existingHash.equalsIgnoreCase(uploadedFileHash)) {
                                        isDuplicate = true;
                                        fileName = existingFile.getName();
                                        imageUrl = "/uploads/" + fileName;
                                        break;
                                    }
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

    // ... other methods ...

    @Override
    public boolean removeServiceFromRoom(Long roomId, Long serviceId) {
        Room room = roomRepository.findByIdAndDeletedFalse(roomId)
            .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy phòng với id: " + roomId));
        com.mpbhms.backend.entity.CustomService service = serviceRepository.findById(serviceId)
            .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy dịch vụ với id: " + serviceId));
        if (room.getServices() == null) return false;
        boolean exists = room.getServices().stream().anyMatch(s -> s.getId().equals(serviceId));
        if (!exists) return false;
        // Kiểm tra nếu dịch vụ đã phát sinh hóa đơn thì không cho xóa
        if (!billDetailRepository.findByServiceIdAndRoomId(serviceId, roomId).isEmpty()) {
            throw new BusinessException("Không thể xóa dịch vụ đã phát sinh hóa đơn. Vui lòng ngừng sử dụng từ kỳ sau.");
        }
        // Nếu là dịch vụ điện, xóa ServiceReading chưa phát sinh hóa đơn
        if (service.getServiceType() == ServiceType.ELECTRICITY) {
            java.util.List<ServiceReading> readings = serviceReadingRepository.findByServiceIdAndRoomId(serviceId, roomId);
            for (ServiceReading reading : readings) {
                serviceReadingRepository.delete(reading);
            }
        }
        // Xóa dịch vụ khỏi phòng
        room.getServices().removeIf(s -> s.getId().equals(serviceId));
        roomRepository.save(room);
        return true;
    }

    @Override
    public List<Room> getAllRoomsNoPaging() {
        return roomRepository.findAll().stream().filter(r -> r.getDeleted() == null || !r.getDeleted()).toList();
    }

    @Override
    public List<Room> getRoomsByIds(List<Long> ids) {
        if (ids == null || ids.isEmpty()) return new ArrayList<>();
        return roomRepository.findAllById(ids).stream().filter(r -> r.getDeleted() == null || !r.getDeleted()).toList();
    }

}
