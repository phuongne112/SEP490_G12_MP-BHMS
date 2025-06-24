package com.mpbhms.backend.service;

import com.mpbhms.backend.dto.AddUsersToRoomRequest;
import com.mpbhms.backend.response.AddUserToRoomDTOResponse;

import java.util.List;

public interface RoomUserService {
    void addUsersToRoom(AddUsersToRoomRequest request);
    void leaveRoom(Long roomUserId);
}
