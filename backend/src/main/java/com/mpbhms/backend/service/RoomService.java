package com.mpbhms.backend.service;

import com.mpbhms.backend.dto.AddRoomDTO;
import com.mpbhms.backend.dto.ResultPaginationDTO;
import com.mpbhms.backend.dto.RoomDTO;
import com.mpbhms.backend.dto.UserInfoDTO;
import com.mpbhms.backend.entity.RoomEntity;
import com.mpbhms.backend.entity.UserInfoEntity;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

import java.util.List;

public interface RoomService {
    RoomEntity addRoom(AddRoomDTO request);

    ResultPaginationDTO getAllRooms(Specification<RoomEntity> spec, Pageable pageable);

    RoomDTO convertToRoomDTO(RoomEntity roomEntity);

    List<RoomDTO> convertToRoomDTOList(List<RoomEntity> rooms);
    RoomEntity updateRoom(Long id, AddRoomDTO request);
    void deleteRoom(Long id);

}

