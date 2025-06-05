package com.mpbhms.backend.response;

import lombok.Data;

import java.time.Instant;

@Data
public class AddUserToRoomDTOResponse {
    private Long roomUserId;
    private Long roomId;
    private Long userId;
    private String username;
    private String email;
    private String roleInRoom;
    private Instant joinedAt;
    private Boolean isActive;
}
