package com.mpbhms.backend.service;

import com.mpbhms.backend.dto.NotificationDTO;
import com.mpbhms.backend.entity.NotificationEntity;

import java.util.List;

public interface NotificationService {
    NotificationEntity createAndSend(NotificationDTO request);
    List<NotificationEntity> getUserNotifications(String email);
    void markAsRead(Long notificationId);
    void deleteNotification(Long notificationId);
}