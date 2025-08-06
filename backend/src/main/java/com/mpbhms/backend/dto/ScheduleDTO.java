package com.mpbhms.backend.dto;

import com.mpbhms.backend.enums.ScheduleStatus;
import lombok.Data;
import java.time.Instant;

@Data
public class ScheduleDTO {
    private Long id;
    private Long roomId;
    private Long renterId;
    private String fullName;
    private String phone;
    private String email;
    private Instant appointmentTime;
    private String note;
    private ScheduleStatus status;
    
    // Thêm thông tin room
    private RoomDTO room;
} 