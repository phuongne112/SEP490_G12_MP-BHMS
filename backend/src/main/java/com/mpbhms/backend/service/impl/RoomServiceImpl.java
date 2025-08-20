package com.mpbhms.backend.service.impl;

import com.mpbhms.backend.dto.*;
// import com.mpbhms.backend.entity.ApiResponse;
import com.mpbhms.backend.entity.Room;
import com.mpbhms.backend.entity.RoomImage;
import com.mpbhms.backend.entity.Asset;
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
// import jakarta.persistence.criteria.Predicate;

import java.io.File;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
// import java.util.stream.Collectors;
import java.nio.file.Files;
import java.security.MessageDigest;
import java.util.Optional;
import com.mpbhms.backend.repository.BillDetailRepository;
import com.mpbhms.backend.repository.RoomServiceMappingRepository;
import com.mpbhms.backend.repository.RoomAssetRepository;
import com.mpbhms.backend.entity.RoomServiceMapping;
import java.time.LocalDate;
import com.mpbhms.backend.entity.Contract;
import com.mpbhms.backend.enums.PaymentCycle;
import com.mpbhms.backend.repository.BillRepository;
import com.mpbhms.backend.entity.Bill;
// import java.time.ZoneId;

@Service
public class RoomServiceImpl implements RoomService {

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
    private RoomServiceMappingRepository roomServiceMappingRepository;

    @Autowired
    private BillRepository billRepository;

    @Autowired
    @Value("${file.upload-dir}")
    private String uploadDir;

    @Autowired
    private ServiceReadingRepository serviceReadingRepository;

    @Autowired
    private RoomAssetRepository roomAssetRepository;

    @Value("${meter.scan.folder}")
    private String scanRoot;

    private boolean isFirstDayOfMonth() {
        return java.time.LocalDate.now().getDayOfMonth() == 1;
    }

    private boolean isRoomNew(Room room) {
        if (room.getCreatedDate() == null) return false;
        java.time.Instant created = room.getCreatedDate();
        java.time.Instant now = java.time.Instant.now();
        return java.time.Duration.between(created, now).toHours() < 24;
    }
    @Override
    public Room addRoom(AddRoomDTO request, MultipartFile[] images) {
        // Kiểm tra phòng đã bị xóa mềm
        Optional<Room> deletedRoomOpt = roomRepository.findByRoomNumberAndDeletedTrue(request.getRoomNumber());
        if (deletedRoomOpt.isPresent()) {
            // Trả về phòng đã bị xóa mềm để FE hỏi người dùng có muốn khôi phục không
            return deletedRoomOpt.get();
        }
        if (roomRepository.existsByRoomNumber(request.getRoomNumber())) {
            throw new com.mpbhms.backend.exception.BusinessException("Số phòng đã tồn tại");
        }
        
        // Kiểm tra số lượng ảnh tối đa (8 ảnh)
        if (images != null && images.length > 8) {
            throw new com.mpbhms.backend.exception.BusinessException("Số lượng ảnh không được vượt quá 8 ảnh");
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
        room.setBuilding(request.getBuilding());
        Long landlordId = SecurityUtil.getCurrentUserId();
        room.setLandlord(userRepository.findById(landlordId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy chủ phòng")));
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
        // Tạo specification để lọc room chưa bị xóa mềm
        Specification<Room> notDeletedSpec = (root, query, criteriaBuilder) -> 
            criteriaBuilder.equal(root.get("deleted"), false);
        
        // Kết hợp specification hiện tại với điều kiện chưa bị xóa
        Specification<Room> combinedSpec = spec != null ? 
            spec.and(notDeletedSpec) : notDeletedSpec;
        
        Page<Room> roomsPage = roomRepository.findAll(combinedSpec, pageable);
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
        dto.setMaxOccupants(room.getMaxOccupants());
        dto.setBuilding(room.getBuilding());

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
        List<ServiceDTO> serviceDTOs = room.getServiceMappings().stream().map(mapping -> {
            ServiceDTO s = new ServiceDTO();
            s.setId(mapping.getService().getId());
            s.setServiceName(mapping.getService().getServiceName());
            s.setUnit(mapping.getService().getUnit());
            s.setUnitPrice(mapping.getService().getUnitPrice());
            s.setServiceType(mapping.getService().getServiceType().name());
            s.setIsActive(mapping.getIsActive());
            s.setEndDate(mapping.getEndDate());
            return s;
        }).toList();
        dto.setServices(serviceDTOs);

        // ✅ Convert assets từ bảng mapping room_asset để đảm bảo có dữ liệu
        List<AssetDTO> assetDTOs = roomAssetRepository.findByRoom(room).stream().map(mapping -> {
            Asset asset = mapping.getAsset();
            AssetDTO a = new AssetDTO();
            a.setId(asset.getId());
            a.setAssetName(asset.getAssetName());
            a.setQuantity(asset.getQuantity());
            a.setConditionNote(asset.getConditionNote());
            a.setAssetImage(asset.getAssetImage());
            return a;
        }).toList();
        dto.setAssets(assetDTOs);

        // Set hasActiveContract: true nếu phòng có hợp đồng ACTIVE
        boolean hasActiveContract = contractRepository.findActiveByRoomId(room.getId()).isPresent();
        dto.setHasActiveContract(hasActiveContract);

        // ✅ Convert roomUsers (người đang ở trong phòng)
        if (room.getRoomUsers() != null) {
            List<RoomUserDTO> roomUserDTOs = room.getRoomUsers().stream()
                .map(ru -> {
                    RoomUserDTO rudto = new RoomUserDTO();
                    rudto.setUserId(ru.getUser() != null ? ru.getUser().getId() : null);
                    rudto.setFullName(ru.getUser() != null && ru.getUser().getUserInfo() != null ? ru.getUser().getUserInfo().getFullName() : null);
                    rudto.setPhoneNumber(ru.getUser() != null && ru.getUser().getUserInfo() != null ? ru.getUser().getUserInfo().getPhoneNumber() : null);
                    rudto.setEmail(ru.getUser() != null ? ru.getUser().getEmail() : null);
                    rudto.setJoinedAt(ru.getJoinedAt());
                    rudto.setIsActive(ru.getIsActive());
                    return rudto;
                })
                .toList();
            dto.setRoomUsers(roomUserDTOs);
        }

        return dto;
    }

    @Override
    public Room updateRoom(Long id, AddRoomDTO request, List<Long> keepImageIds, MultipartFile[] images) {
        Room room = roomRepository.findByIdAndDeletedFalse(id)
                .orElseThrow(() -> new IdInvalidException("Phòng với id này không tồn tại."));

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
        room.setBuilding(request.getBuilding());

        // Nếu scanFolder null thì set = roomNumber
        if (room.getScanFolder() == null || room.getScanFolder().isBlank()) {
            room.setScanFolder(room.getRoomNumber());
        }

        // Chỉ update ảnh nếu FE gửi keepImageIds (có thể là mảng rỗng) hoặc images
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
            
            // Kiểm tra tổng số ảnh (ảnh giữ lại + ảnh mới) không được vượt quá 8
            int totalImages = imagesToKeep.size() + (images != null ? images.length : 0);
            if (totalImages > 8) {
                throw new com.mpbhms.backend.exception.BusinessException("Tổng số ảnh không được vượt quá 8 ảnh");
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

    @Override
    public void deleteRoom(Long id) {
        Room room = roomRepository.findByIdAndDeletedFalse(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy phòng với id: " + id));
        
        // Kiểm tra người ở
        int userCount = roomUserRepository.countByRoomId(id);
        if (userCount > 0) {
            throw new BusinessException("Không thể xóa phòng: Vẫn còn người thuê trong phòng này.");
        }
        // Kiểm tra hợp đồng active
        boolean hasActiveContract = contractRepository.findActiveByRoomId(id).isPresent();
        if (hasActiveContract) {
            throw new BusinessException("Không thể xóa phòng: Phòng này đang có hợp đồng hoạt động.");
        }
        
        // Soft delete - set deleted = true thay vì xóa cứng
        room.setDeleted(true);
        roomRepository.save(room);
    }

    @Override
    public void restoreRoom(Long id) {
        Room room = roomRepository.findByIdAndDeletedTrue(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy phòng hoặc phòng chưa bị xóa với id: " + id));
        
        // Restore room - set deleted = false
        room.setDeleted(false);
        roomRepository.save(room);
    }

    @Override
    public void updateRoomStatus(Long id, String status) {
        Room room = roomRepository.findByIdAndDeletedFalse(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy phòng với id: " + id));
        try {
            RoomStatus newStatus = RoomStatus.valueOf(status);
            // Chặn nếu phòng đang có người ở mà muốn chuyển sang Bảo trì hoặc Ngừng hoạt động
            int userCount = roomUserRepository.countByRoomId(id);
            if ((newStatus == RoomStatus.Maintenance || newStatus == RoomStatus.Inactive) && userCount > 0) {
                throw new BusinessException("Không thể chuyển phòng sang trạng thái 'Bảo trì' hoặc 'Ngừng hoạt động' khi vẫn còn người ở trong phòng.");
            }
            room.setRoomStatus(newStatus);
            roomRepository.save(room);
        } catch (IllegalArgumentException e) {
            throw new BusinessException("Trạng thái phòng không hợp lệ: " + status);
        }
    }

    @Override
    public void toggleActiveStatus(Long id) {
        Room room = roomRepository.findByIdAndDeletedFalse(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy phòng với id: " + id));
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

    @Override
    public ResultPaginationDTO getDeletedRooms(Pageable pageable) {
        Page<Room> roomsPage = roomRepository.findByDeletedTrue(pageable);
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

    @Override
    public Room getRoomById(Long id) {
        Room room = roomRepository.findByIdAndDeletedFalse(id)
                .orElseThrow(() -> new IdInvalidException("Không tìm thấy phòng với id: " + id));
        if (room.getScanFolder() == null || room.getScanFolder().isBlank()) {
            room.setScanFolder(room.getRoomNumber());
        }
        return room;
    }

    @Override
    public boolean addServiceToRoom(Long roomId, Long serviceId) {
        Room room = roomRepository.findByIdAndDeletedFalse(roomId)
            .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy phòng với id: " + roomId));
        boolean isFirstDay = isFirstDayOfMonth();
        boolean isNewRoom = isRoomNew(room);
        if (!isFirstDay && !isNewRoom) {
            throw new BusinessException("Chỉ được phép thêm dịch vụ vào đầu tháng hoặc trong 24h sau khi tạo phòng.");
        }
        com.mpbhms.backend.entity.CustomService service = serviceRepository.findById(serviceId)
            .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy dịch vụ với id: " + serviceId));

        // Kiểm tra nghiệp vụ: chỉ cho phép thêm dịch vụ vào đầu tháng hoặc khi phòng chưa có dịch vụ nào
        boolean hasAnyService = room.getServiceMappings().stream().anyMatch(mapping -> Boolean.TRUE.equals(mapping.getIsActive()));
        if (!isFirstDay && hasAnyService) {
            throw new BusinessException("Chỉ được phép thêm dịch vụ vào đầu tháng hoặc khi phòng chưa có dịch vụ nào.");
        }

        // Nếu là dịch vụ điện, kiểm tra phòng đã có dịch vụ điện active chưa
        if (service.getServiceType() == ServiceType.ELECTRICITY) {
            boolean hasActiveElectric = room.getServiceMappings().stream()
                .anyMatch(mapping -> mapping.getIsActive() != null && mapping.getIsActive()
                    && mapping.getService() != null
                    && mapping.getService().getServiceType() == ServiceType.ELECTRICITY);
            if (hasActiveElectric) {
                throw new BusinessException("Phòng này đã có đồng hồ điện đang hoạt động. Vui lòng ngừng dịch vụ điện cũ trước khi thêm mới.");
            }
        }

        // Kiểm tra mapping đã tồn tại và còn active chưa
        Optional<RoomServiceMapping> existing = roomServiceMappingRepository.findByRoomIdAndServiceId(roomId, serviceId);
        if (existing.isPresent() && Boolean.TRUE.equals(existing.get().getIsActive())) {
            throw new BusinessException("Dịch vụ đã tồn tại trong phòng này. Không thể thêm trùng.");
        }

        // Tạo mới mapping
        RoomServiceMapping mapping = new RoomServiceMapping();
        mapping.setRoom(room);
        mapping.setService(service);
        mapping.setIsActive(true);
        mapping.setEndDate(null);
        roomServiceMappingRepository.save(mapping);

        // Nếu là điện, tạo ServiceReading ban đầu = 0
        if (service.getServiceType() == ServiceType.ELECTRICITY) {
            ServiceReading reading = new ServiceReading();
            reading.setRoom(room);
            reading.setService(service);
            reading.setOldReading(java.math.BigDecimal.ZERO);
            reading.setNewReading(java.math.BigDecimal.ZERO);
            reading.setCreatedDate(java.time.Instant.now());
            serviceReadingRepository.save(reading);

            // Tạo thư mục scanFolder cho phòng nếu chưa tồn tại (dùng đường dẫn tuyệt đối)
            String roomFolder = scanRoot + File.separator + room.getRoomNumber();
            File folder = new File(roomFolder);
            if (!folder.exists()) {
                boolean created = folder.mkdirs();
                System.out.println("Tạo folder: " + folder.getAbsolutePath() + " - " + (created ? "Thành công" : "Thất bại"));
            } else {
                System.out.println("Folder đã tồn tại: " + folder.getAbsolutePath());
            }
        }
        return true;
    }

    @Override
    public boolean addServiceToRoom(Long roomId, Long serviceId, BigDecimal initialReading) {
        Room room = roomRepository.findByIdAndDeletedFalse(roomId)
            .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy phòng với id: " + roomId));
        com.mpbhms.backend.entity.CustomService service = serviceRepository.findById(serviceId)
            .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy dịch vụ với id: " + serviceId));

        // Nếu là dịch vụ điện, kiểm tra phòng đã có dịch vụ điện active chưa
        if (service.getServiceType() == ServiceType.ELECTRICITY) {
            boolean hasActiveElectric = room.getServiceMappings().stream()
                .anyMatch(mapping -> mapping.getIsActive() != null && mapping.getIsActive()
                    && mapping.getService() != null
                    && mapping.getService().getServiceType() == ServiceType.ELECTRICITY);
            if (hasActiveElectric) {
                throw new BusinessException("Phòng này đã có đồng hồ điện đang hoạt động. Vui lòng ngừng dịch vụ điện cũ trước khi thêm mới.");
            }
        }

        // Kiểm tra mapping đã tồn tại và còn active chưa
        Optional<RoomServiceMapping> existing = roomServiceMappingRepository.findByRoomIdAndServiceId(roomId, serviceId);
        if (existing.isPresent() && Boolean.TRUE.equals(existing.get().getIsActive())) {
            throw new BusinessException("Dịch vụ đã tồn tại trong phòng này. Không thể thêm trùng.");
        }

        // Tạo mới mapping
        RoomServiceMapping mapping = new RoomServiceMapping();
        mapping.setRoom(room);
        mapping.setService(service);
        mapping.setIsActive(true);
        mapping.setEndDate(null);
        roomServiceMappingRepository.save(mapping);

        // Nếu là điện và có initialReading, tạo ServiceReading
        if (service.getServiceType() == ServiceType.ELECTRICITY && initialReading != null) {
            ServiceReading reading = new ServiceReading();
            reading.setRoom(room);
            reading.setService(service);
            reading.setOldReading(initialReading);
            reading.setNewReading(initialReading);
            reading.setCreatedDate(java.time.Instant.now());
            serviceReadingRepository.save(reading);

            // Tạo thư mục scanFolder cho phòng nếu chưa tồn tại (dùng đường dẫn tuyệt đối)
            String roomFolder = scanRoot + File.separator + room.getRoomNumber();
            File folder = new File(roomFolder);
            if (!folder.exists()) {
                boolean created = folder.mkdirs();
                System.out.println("Tạo folder: " + folder.getAbsolutePath() + " - " + (created ? "Thành công" : "Thất bại"));
            } else {
                System.out.println("Folder đã tồn tại: " + folder.getAbsolutePath());
            }
        }
        return true;
    }

    @Override
    public boolean removeServiceFromRoom(Long roomId, Long serviceId) {
        Room room = roomRepository.findByIdAndDeletedFalse(roomId)
            .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy phòng với id: " + roomId));
        boolean isFirstDay = isFirstDayOfMonth();
        boolean isNewRoom = isRoomNew(room);
        if (!isFirstDay && !isNewRoom) {
            throw new BusinessException("Chỉ được phép xóa dịch vụ vào đầu tháng hoặc trong 24h sau khi tạo phòng.");
        }
        // Tìm mapping (RoomServiceMapping)
        RoomServiceMapping mapping = roomServiceMappingRepository.findByRoomIdAndServiceId(roomId, serviceId)
            .orElseThrow(() -> new BusinessException("Không tìm thấy mapping dịch vụ trong phòng"));

        // Nếu mapping đang active, kiểm tra hóa đơn
        if (Boolean.TRUE.equals(mapping.getIsActive())) {
            if (!billDetailRepository.findByServiceIdAndRoomId(serviceId, roomId).isEmpty()) {
                throw new BusinessException("Không thể xóa dịch vụ đã phát sinh hóa đơn. Vui lòng ngừng sử dụng từ kỳ sau.");
            }
        }
        // Nếu là dịch vụ điện, xóa luôn các bản ghi ServiceReading liên quan
        if (mapping.getService() != null && mapping.getService().getServiceType() == ServiceType.ELECTRICITY) {
            List<ServiceReading> readings = serviceReadingRepository.findByRoomAndService(mapping.getRoom(), mapping.getService());
            serviceReadingRepository.deleteAll(readings);

            // Xóa folder ảnh OCR của phòng
            String roomNumber = mapping.getRoom().getRoomNumber();
            String roomFolder = scanRoot + File.separator + roomNumber;
            File folder = new File(roomFolder);
            if (folder.exists() && folder.isDirectory()) {
                deleteDirectoryRecursively(folder);
                System.out.println("Đã xóa folder OCR: " + folder.getAbsolutePath());
            }
        }
        // Nếu mapping đã ngừng sử dụng (isActive=false), cho phép xóa luôn
        roomServiceMappingRepository.delete(mapping);
        return true;
    }

    @Override
    public void deactivateServiceForRoom(Long roomId, Long serviceId) {
        Room room = roomRepository.findByIdAndDeletedFalse(roomId)
            .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy phòng với id: " + roomId));
        boolean isFirstDay = isFirstDayOfMonth();
        boolean isNewRoom = isRoomNew(room);
        if (!isFirstDay && !isNewRoom) {
            throw new BusinessException("Chỉ được phép ngừng sử dụng dịch vụ vào ngày 1 hàng tháng hoặc trong 24h đầu sau khi tạo phòng. Nếu phòng đã tạo quá 24h, vui lòng chờ đến ngày 1 tháng sau để ngừng dịch vụ.");
        }
        RoomServiceMapping mapping = roomServiceMappingRepository.findByRoomIdAndServiceId(roomId, serviceId)
            .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy dịch vụ này trong phòng."));
        if (Boolean.FALSE.equals(mapping.getIsActive())) {
            throw new BusinessException("Dịch vụ này đã được ngừng sử dụng trước đó.");
        }
        mapping.setIsActive(false);
        mapping.setEndDate(java.time.LocalDate.now());
        roomServiceMappingRepository.save(mapping);
    }
    
    /**
     * Kiểm tra thời điểm ngừng dịch vụ có phù hợp với chu kỳ thanh toán
     */
    private void validateDeactivationTiming(Long roomId) {
        // Lấy hợp đồng active của phòng
        Contract activeContract = contractRepository.findActiveByRoomId(roomId)
            .orElseThrow(() -> new BusinessException("Không có hợp đồng đang hoạt động cho phòng này"));
        
        PaymentCycle cycle = activeContract.getPaymentCycle();
        LocalDate today = LocalDate.now();
        boolean isAllowed = false;
        switch (cycle) {
            case MONTHLY:
                isAllowed = (today.getDayOfMonth() >= 28) || (today.getDayOfMonth() <= 5);
                break;
            case QUARTERLY:
                isAllowed = ((today.getMonthValue() % 3 == 0) && today.getDayOfMonth() >= 28)
                            || ((today.getMonthValue() % 3 == 1) && today.getDayOfMonth() <= 5);
                break;
            case YEARLY:
                isAllowed = (today.getMonthValue() == 12 && today.getDayOfMonth() >= 28)
                            || (today.getMonthValue() == 1 && today.getDayOfMonth() <= 5);
                break;
        }
        if (!isAllowed) {
            throw new BusinessException(
                "Bạn chỉ được phép ngừng dịch vụ vào ngày cuối kỳ hoặc đầu kỳ thanh toán (ví dụ: ngày 28-31 hoặc 1-5 của tháng/kỳ). " +
                "Vui lòng thực hiện thao tác này vào thời điểm phù hợp để đảm bảo hóa đơn được tính toán chính xác."
            );
        }
        // Kiểm tra có hóa đơn chưa thanh toán không
        List<Bill> unpaidBills = billRepository.findByRoomId(roomId, Pageable.unpaged())
            .getContent().stream()
            .filter(bill -> !Boolean.TRUE.equals(bill.getStatus()))
            .toList();
        if (!unpaidBills.isEmpty()) {
            throw new BusinessException(
                "Không thể ngừng dịch vụ khi có hóa đơn chưa thanh toán. " +
                "Vui lòng thanh toán hết hóa đơn trước khi ngừng dịch vụ."
            );
        }
    }

    @Override
    public void reactivateServiceForRoom(Long roomId, Long serviceId) {
        Room room = roomRepository.findByIdAndDeletedFalse(roomId)
            .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy phòng với id: " + roomId));
        boolean isFirstDay = isFirstDayOfMonth();
        boolean isNewRoom = isRoomNew(room);
        if (!isFirstDay && !isNewRoom) {
            throw new BusinessException("Chỉ được phép sử dụng lại dịch vụ vào đầu tháng hoặc trong 24h sau khi tạo phòng.");
        }
        RoomServiceMapping mapping = roomServiceMappingRepository.findByRoomIdAndServiceId(roomId, serviceId)
            .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy dịch vụ này trong phòng."));
        // Nếu đang active và chưa có endDate thì thực sự đang dùng -> chặn
        if (Boolean.TRUE.equals(mapping.getIsActive()) && mapping.getEndDate() == null) {
            throw new BusinessException("Dịch vụ này đang được sử dụng.");
        }
        // Cho phép bật lại nếu đã từng ngừng (có endDate) dù isActive còn true do dữ liệu cũ
        mapping.setIsActive(true);
        // Khi sử dụng lại dịch vụ, cần xóa ngày kết thúc trước đó để phản ánh trạng thái đang dùng
        mapping.setEndDate(null);
        roomServiceMappingRepository.save(mapping);
    }

    @Override
    public List<Room> getAllRoomsNoPaging() {
        List<Room> rooms = roomRepository.findAllByDeletedFalse();
        for (Room room : rooms) {
            if (room.getScanFolder() == null || room.getScanFolder().isBlank()) {
                room.setScanFolder(room.getRoomNumber());
            }
        }
        return rooms;
    }

    @Override
    public List<Room> getRoomsByIds(List<Long> ids) {
        List<Room> rooms = roomRepository.findByIdInAndDeletedFalse(ids);
        for (Room room : rooms) {
            if (room.getScanFolder() == null || room.getScanFolder().isBlank()) {
                room.setScanFolder(room.getRoomNumber());
            }
        }
        return rooms;
    }

    @Override
    public void updateScanFolder(Long id, String scanFolder) {
        Room room = roomRepository.findByIdAndDeletedFalse(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy phòng với id: " + id));
        room.setScanFolder(scanFolder);
        roomRepository.save(room);
    }

    // Thêm hàm tiện ích xóa folder đệ quy
    private void deleteDirectoryRecursively(File dir) {
        if (dir.isDirectory()) {
            File[] children = dir.listFiles();
            if (children != null) {
                for (File child : children) {
                    deleteDirectoryRecursively(child);
                }
            }
        }
        dir.delete();
    }
}
