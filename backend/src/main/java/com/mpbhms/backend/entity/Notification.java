package com.mpbhms.backend.entity;

import com.mpbhms.backend.enums.NotificationStatus;
import com.mpbhms.backend.enums.NotificationType;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Setter
@Getter
@Table(name = "Notifications")
public class Notification extends BaseEntity {
    private String title;

    @Column(columnDefinition = "TEXT")
    private String message;

    @Enumerated(EnumType.STRING)
    private NotificationType type;

    @Enumerated(EnumType.STRING)
    private NotificationStatus status = NotificationStatus.SENT;

    private Long recipientId;

    private LocalDateTime readAt;

    @Column(columnDefinition = "TEXT")
    private String metadata;
}