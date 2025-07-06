package com.mpbhms.backend.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class UpdateRoomStatusDTO {
    @NotBlank(message = "Vui lòng chọn trạng thái phòng")
    private String roomStatus;
} 