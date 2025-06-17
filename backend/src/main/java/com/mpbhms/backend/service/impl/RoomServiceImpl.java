package com.mpbhms.backend.service.impl;

import com.mpbhms.backend.dto.*;
import com.mpbhms.backend.entity.Room;
import com.mpbhms.backend.entity.RoomImage;
import com.mpbhms.backend.exception.IdInvalidException;
import com.mpbhms.backend.repository.RoomRepository;
import com.mpbhms.backend.repository.UserRepository;
import com.mpbhms.backend.service.RoomService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import com.mpbhms.backend.enums.RoomStatus;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class RoomServiceImpl implements RoomService {

    @Autowired
    private RoomRepository roomRepository;

    @Autowired
    private UserRepository userRepository;

    @Override
    public Room addRoom(AddRoomDTO request) {
        if (roomRepository.existsByRoomNumber(request.getRoomNumber())) {
            throw new RuntimeException("Room number already exists");
        }

        Room room = new Room();
        room.setRoomNumber(request.getRoomNumber());
        room.setArea(request.getArea());
        room.setPricePerMonth(request.getPricePerMonth());
        room.setRoomStatus(RoomStatus.valueOf(request.getRoomStatus()));
        room.setNumberOfBedrooms(request.getNumberOfBedrooms());
        room.setNumberOfBathrooms(request.getNumberOfBathrooms());
        room.setDescription(request.getDescription());
        room.setIsActive(true);

        //Xử lý ảnh nếu có
        if (request.getImageUrls() != null && !request.getImageUrls().isEmpty()) {
            List<RoomImage> imageEntities = request.getImageUrls().stream()
                    .map(url -> {
                        RoomImage img = new RoomImage();
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

        // Convert images
        List<RoomImageDTO> imageDTOs = room.getImages().stream().map(image -> {
            RoomImageDTO img = new RoomImageDTO();
            img.setId(image.getId());
            img.setImageUrl(image.getImageURL());
            return img;
        }).toList();
        dto.setImages(imageDTOs); // ✅ đảm bảo RoomDTO có setter

        // Convert services
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

        // Convert assets
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
    public Room updateRoom(Long id, AddRoomDTO request) {
        Room room = roomRepository.findById(id)
                .orElseThrow(() -> new IdInvalidException("Room với id  không tồn tại."));

        room.setRoomNumber(request.getRoomNumber());
        room.setArea(request.getArea());
        room.setPricePerMonth(request.getPricePerMonth());
        room.setRoomStatus(RoomStatus.valueOf(request.getRoomStatus()));
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
