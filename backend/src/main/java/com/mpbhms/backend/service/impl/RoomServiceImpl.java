package com.mpbhms.backend.service.impl;

import com.mpbhms.backend.dto.*;
import com.mpbhms.backend.entity.RoomEntity;
import com.mpbhms.backend.entity.RoomImageEntity;
import com.mpbhms.backend.entity.UserEntity;
import com.mpbhms.backend.entity.UserInfoEntity;
import com.mpbhms.backend.exception.IdInvalidException;
import com.mpbhms.backend.repository.RoomRepository;
import com.mpbhms.backend.repository.UserRepository;
import com.mpbhms.backend.service.RoomService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.crossstore.ChangeSetPersister;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class RoomServiceImpl implements RoomService {

    @Autowired
    private RoomRepository roomRepository;

    @Autowired
    private UserRepository userRepository;

    @Override
    public RoomEntity addRoom(AddRoomDTO request) {
        if (roomRepository.existsByRoomNumber(request.getRoomNumber())) {
            throw new RuntimeException("Room number already exists");
        }

        RoomEntity room = new RoomEntity();
        room.setRoomNumber(request.getRoomNumber());
        room.setArea(request.getArea());
        room.setPricePerMonth(request.getPricePerMonth());
        room.setRoomStatus(RoomEntity.RoomStatus.valueOf(request.getRoomStatus()));
        room.setNumberOfBedrooms(request.getNumberOfBedrooms());
        room.setNumberOfBathrooms(request.getNumberOfBathrooms());
        room.setDescription(request.getDescription());
        room.setIsActive(true);

        //Xử lý ảnh nếu có
        if (request.getImageUrls() != null && !request.getImageUrls().isEmpty()) {
            List<RoomImageEntity> imageEntities = request.getImageUrls().stream()
                    .map(url -> {
                        RoomImageEntity img = new RoomImageEntity();
                        img.setImageURL(url);
                        img.setRoom(room); // liên kết ngược lại
                        return img;
                    })
                    .collect(Collectors.toList());

            room.setImages(imageEntities); // gán ảnh vào phòng
        }

        return roomRepository.save(room);
    }

    @Override
    public ResultPaginationDTO getAllRooms(Specification<RoomEntity> spec, Pageable pageable) {
        Page<RoomEntity> roomsPage = roomRepository.findAll(spec, pageable);
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
    public List<RoomDTO> convertToRoomDTOList(List<RoomEntity> rooms) {
        return rooms.stream().map(this::convertToRoomDTO).toList();
    }

    public RoomDTO convertToRoomDTO(RoomEntity roomEntity) {
        RoomDTO dto = new RoomDTO();
        dto.setId(roomEntity.getId());
        dto.setRoomNumber(roomEntity.getRoomNumber());
        dto.setArea(roomEntity.getArea());
        dto.setRoomStatus(roomEntity.getRoomStatus() != null ? roomEntity.getRoomStatus().name() : null);
        dto.setPricePerMonth(roomEntity.getPricePerMonth());
        dto.setNumberOfBedrooms(roomEntity.getNumberOfBedrooms());
        dto.setNumberOfBathrooms(roomEntity.getNumberOfBathrooms());
        dto.setDescription(roomEntity.getDescription());

        // Convert images
        List<RoomImageDTO> imageDTOs = roomEntity.getImages().stream().map(image -> {
            RoomImageDTO img = new RoomImageDTO();
            img.setId(image.getId());
            img.setImageUrl(image.getImageURL());
            return img;
        }).toList();
        dto.setImages(imageDTOs); // ✅ đảm bảo RoomDTO có setter

        // Convert services
        List<ServiceDTO> serviceDTOs = roomEntity.getServices().stream().map(service -> {
            ServiceDTO s = new ServiceDTO();
            s.setId(service.getId());
            s.setServiceName(service.getServiceName());
            s.setUnit(service.getUnit());
            s.setUnitPrice(service.getUnitPrice());
            s.setServiceType(service.getServiceType().name());
            return s;
        }).toList();
        dto.setServices(serviceDTOs);

        // Convert assets
        List<AssetDTO> assetDTOs = roomEntity.getAssets().stream().map(asset -> {
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
    public RoomEntity updateRoom(Long id, AddRoomDTO request) {
        RoomEntity room = roomRepository.findById(id)
                .orElseThrow(() -> new IdInvalidException("Room với id  không tồn tại."));

        room.setRoomNumber(request.getRoomNumber());
        room.setArea(request.getArea());
        room.setPricePerMonth(request.getPricePerMonth());
        room.setRoomStatus(RoomEntity.RoomStatus.valueOf(request.getRoomStatus()));
        room.setNumberOfBedrooms(request.getNumberOfBedrooms());
        room.setNumberOfBathrooms(request.getNumberOfBathrooms());
        room.setDescription(request.getDescription());
        room.setIsActive(true);

        return roomRepository.save(room);
    }

    @Override
    public void deleteRoom(Long id) {
      roomRepository.deleteById(id);
    }

}
