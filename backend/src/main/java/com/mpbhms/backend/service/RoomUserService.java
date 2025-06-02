package com.mpbhms.backend.service;

import com.mpbhms.backend.dto.AddUserToRoomDTO;
import com.mpbhms.backend.dto.AddUserToRoomLDTO;
import com.mpbhms.backend.response.AddUserToRoomDTOResponse;

import java.util.List;

public interface RoomUserService {
    AddUserToRoomDTOResponse addUserToRoom(Long roomId, AddUserToRoomDTO request);
    List<AddUserToRoomDTOResponse> addUserToRoomL(Long roomId, AddUserToRoomLDTO request);
}
