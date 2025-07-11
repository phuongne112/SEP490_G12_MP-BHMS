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

}
