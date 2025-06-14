package com.mpbhms.backend.service;

import com.mpbhms.backend.dto.NotificationDTO;
import com.mpbhms.backend.dto.ResultPaginationDTO;
import com.mpbhms.backend.entity.NotificationEntity;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

import java.util.List;

public interface NotificationService {
    NotificationEntity createAndSend(NotificationDTO request);
    List<NotificationEntity> getUserNotifications(String email);
    void markAsRead(Long notificationId);
    void deleteNotification(Long notificationId);
    List<NotificationEntity> getNotifications();
    ResultPaginationDTO getAllNotifications(Specification<NotificationEntity> spec, Pageable pageable);

}