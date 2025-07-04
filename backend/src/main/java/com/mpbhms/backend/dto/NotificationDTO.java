package com.mpbhms.backend.dto;

import com.mpbhms.backend.enums.NotificationType;
import com.mpbhms.backend.enums.NotificationStatus;
import lombok.Data;
import java.time.Instant;

@Data
public class NotificationDTO {
    private Long id;
    private String title;
    private String message;
    private NotificationType type;
    private Long recipientId;
    private String metadata;
    private Instant createdDate;
    private NotificationStatus status;
    private String recipientEmail;
}