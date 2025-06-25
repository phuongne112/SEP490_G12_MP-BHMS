package com.mpbhms.backend.dto;

import lombok.Data;
import java.time.Instant;

@Data
public class CreateScheduleRequest {
    private Long roomId;
    private Long renterId; // optional
    private String fullName;
    private String phone;
    private String email;
    private Instant appointmentTime;
    private String note;
} 