package com.mpbhms.backend.dto;

import com.mpbhms.backend.enums.NotificationType;
import com.mpbhms.backend.enums.NotificationStatus;
import lombok.Data;
import java.time.Instant;
import java.util.List;

@Data
public class NotificationDTO {
    private Long id;
    private String title;
    private String message;
    private NotificationType type;
    private String displayType; // Vietnamese display name
    private Long recipientId;
    private List<Long> recipientIds; // For multiple recipients
    private String metadata;
    private Instant createdDate;
    private NotificationStatus status;
    private String displayStatus; // Vietnamese display name for status
    private String recipientEmail;
}