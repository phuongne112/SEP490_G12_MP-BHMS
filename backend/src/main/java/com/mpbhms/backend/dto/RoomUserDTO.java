package com.mpbhms.backend.dto;

import lombok.Data;
import java.time.Instant;

@Data
public class RoomUserDTO {
    private Long userId;
    private String fullName;
    private String phoneNumber;
    private String email;
    private Instant joinedAt;
    private Boolean isActive;
} 