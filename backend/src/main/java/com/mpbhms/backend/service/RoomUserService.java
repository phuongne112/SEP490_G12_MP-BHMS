package com.mpbhms.backend.service;

import com.mpbhms.backend.dto.AddUsersToRoomRequest;
import com.mpbhms.backend.response.AddUserToRoomDTOResponse;

import java.util.List;
import com.mpbhms.backend.entity.Room;

public interface RoomUserService {
    void addUsersToRoom(AddUsersToRoomRequest request);
    Room getCurrentRenterRoom();
    /**
     * Lấy thông tin phòng chi tiết của người đang đăng nhập
     */
    java.util.Map<String, Object> getCurrentRenterRoomDetail();
    /**
     * Người thuê rời phòng
     */
    void leaveRoom(Long roomUserId);
}
