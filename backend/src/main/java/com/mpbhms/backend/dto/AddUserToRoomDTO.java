package com.mpbhms.backend.dto;

import lombok.Data;

@Data
public class AddUserToRoomDTO {
    private Long userId;
    private String roleInRoom; // "Tenant" hoặc "Co_Tenant"
}
