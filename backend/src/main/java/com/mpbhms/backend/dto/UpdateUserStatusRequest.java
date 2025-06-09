package com.mpbhms.backend.dto;

import lombok.Data;

@Data
public class UpdateUserStatusRequest {
    private boolean isActive;
}