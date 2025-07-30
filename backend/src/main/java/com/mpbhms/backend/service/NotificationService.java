package com.mpbhms.backend.service;

import com.mpbhms.backend.dto.NotificationDTO;
import com.mpbhms.backend.dto.ResultPaginationDTO;
import com.mpbhms.backend.entity.Notification;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

import java.util.List;

public interface NotificationService {
    Notification createAndSend(NotificationDTO request);
    List<Notification> createAndSendMultiple(NotificationDTO request);
    List<Notification> getUserNotifications(String email);
    void markAsRead(Long notificationId);
    void deleteNotification(Long notificationId);
    List<Notification> getNotifications();
    ResultPaginationDTO getAllNotifications(Specification<Notification> spec, Pageable pageable);

}