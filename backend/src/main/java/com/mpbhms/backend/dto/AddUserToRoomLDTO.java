package com.mpbhms.backend.dto;

import lombok.Data;

import java.util.List;
@Data
public class AddUserToRoomLDTO {
    private List<Long> userIds;
    private String roleInRoom; // Ví dụ: "Co_Tenant"
}
