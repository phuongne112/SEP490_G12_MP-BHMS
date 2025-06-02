package com.mpbhms.backend.service.impl;

import com.mpbhms.backend.dto.AddRoomDTO;
import com.mpbhms.backend.dto.Meta;
import com.mpbhms.backend.dto.ResultPaginationDTO;
import com.mpbhms.backend.dto.UserInfoDTO;
import com.mpbhms.backend.entity.RoomEntity;
import com.mpbhms.backend.entity.UserEntity;
import com.mpbhms.backend.entity.UserInfoEntity;
import com.mpbhms.backend.repository.RoomRepository;
import com.mpbhms.backend.repository.UserRepository;
import com.mpbhms.backend.service.RoomService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class RoomServiceImpl implements RoomService {

    @Autowired
    private RoomRepository roomRepository;

    @Autowired
    private UserRepository userRepository;

    @Override
    public RoomEntity addRoom(AddRoomDTO request) {
        if (roomRepository.existsByRoomNumber((request.getRoomNumber()))) {
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

        return roomRepository.save(room);
    }
//    @Override
//    public ResultPaginationDTO getAllRooms(Pageable pageable) {
//        Page<RoomEntity> roomsPage = roomRepository.findAllByIsActiveTrue(pageable);
//        List<AddRoomDTO> roomDTOs = convertToAddRoomDTOList(roomsPage.getContent());
//
//        Meta meta = new Meta();
//        meta.setPage(roomsPage.getNumber() + 1); // FE bắt đầu từ 1
//        meta.setPageSize(roomsPage.getSize());
//        meta.setPages(roomsPage.getTotalPages());
//        meta.setTotal(roomsPage.getTotalElements());
//
//        ResultPaginationDTO rs = new ResultPaginationDTO();
//        rs.setMeta(meta);
//        rs.setResult(roomDTOs);
//
//        return rs;
//    }

    @Override
    public ResultPaginationDTO getAllRooms(Specification<RoomEntity> spec, Pageable pageable) {
        Page<RoomEntity> roomsPage = roomRepository.findAll(spec, pageable);

        Meta meta = new Meta();
        meta.setPage(roomsPage.getNumber());
        meta.setPageSize(roomsPage.getSize());
        meta.setPages(roomsPage.getTotalPages());
        meta.setTotal(roomsPage.getTotalElements());

        ResultPaginationDTO result = new ResultPaginationDTO();
        result.setMeta(meta);
        result.setResult(roomsPage.getContent()); // Trả về list<RoomEntity>

        return result;
    }



    public List<AddRoomDTO> convertToAddRoomDTOList(List<RoomEntity> rooms) {
        return rooms.stream().map(this::convertToAddRoomDTO).toList();
    }

    public AddRoomDTO convertToAddRoomDTO(RoomEntity roomEntity) {
        AddRoomDTO dto = new AddRoomDTO();
        dto.setId(roomEntity.getId());
        dto.setRoomNumber(roomEntity.getRoomNumber());
        dto.setArea(roomEntity.getArea());
        dto.setPricePerMonth(roomEntity.getPricePerMonth());
        dto.setNumberOfBedrooms(roomEntity.getNumberOfBedrooms());
        dto.setNumberOfBathrooms(roomEntity.getNumberOfBathrooms());
        dto.setDescription(roomEntity.getDescription());
        return dto;
    }
}
