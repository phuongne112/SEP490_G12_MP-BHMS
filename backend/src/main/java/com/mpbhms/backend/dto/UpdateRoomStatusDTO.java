package com.mpbhms.backend.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class UpdateRoomStatusDTO {
    @NotBlank(message = "Room status is required")
    private String roomStatus;
} 