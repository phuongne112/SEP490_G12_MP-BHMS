package com.mpbhms.backend.dto;

import com.mpbhms.backend.enums.NotificationType;
import lombok.Data;

@Data
public class NotificationDTO {
    private String title;
    private String message;
    private NotificationType type;
    private Long recipientId;
    private String metadata;
}
