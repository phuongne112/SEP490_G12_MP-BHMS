package com.mpbhms.backend.service.impl;

import com.mpbhms.backend.dto.Meta;
import com.mpbhms.backend.dto.NotificationDTO;
import com.mpbhms.backend.dto.ResultPaginationDTO;
import com.mpbhms.backend.entity.NotificationEntity;
import com.mpbhms.backend.enums.NotificationStatus;
import com.mpbhms.backend.repository.NotificationRepository;
import com.mpbhms.backend.repository.UserRepository;
import com.mpbhms.backend.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class NotificationServiceImpl implements NotificationService {
    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;


    @Override
    public NotificationEntity createAndSend(NotificationDTO request) {
        NotificationEntity notification = new NotificationEntity();
        notification.setTitle(request.getTitle());
        notification.setMessage(request.getMessage());
        notification.setType(request.getType());
        notification.setRecipientId(request.getRecipientId());
        notification.setMetadata(request.getMetadata());
        notification.setStatus(NotificationStatus.SENT);

        NotificationEntity saved = notificationRepository.save(notification);

        // Gửi WebSocket: nếu có recipientId thì gửi riêng, ngược lại gửi broadcast
        if (request.getRecipientId() != null) {
            userRepository.findById(request.getRecipientId()).ifPresent(user -> {
                messagingTemplate.convertAndSendToUser(
                        user.getUsername(), // username là định danh cho user trong websocket
                        "/queue/notifications",
                        saved
                );
            });
        } else {
            // Gửi toàn hệ thống (broadcast)
            messagingTemplate.convertAndSend("/topic/notifications", saved);
        }

        return saved;
    }

    @Override
    public List<NotificationEntity> getUserNotifications(String email) {
        Long userId = userRepository.findByEmail(email).getId();
        return notificationRepository.findByRecipientIdOrderByCreatedDateDesc(userId);
    }

    @Override
    public void markAsRead(Long notificationId) {
        notificationRepository.findById(notificationId).ifPresent(n -> {
            n.setStatus(NotificationStatus.READ);
            n.setReadAt(LocalDateTime.now());
            notificationRepository.save(n);
        });
    }

    @Override
    public void deleteNotification(Long notificationId) {
        notificationRepository.findById(notificationId).ifPresent(notificationRepository::delete);
    }

    @Override
    public List<NotificationEntity> getNotifications() {
        return notificationRepository.findAll();
    }

    @Override
    public ResultPaginationDTO getAllNotifications(Specification<NotificationEntity> spec, Pageable pageable) {
        Page<NotificationEntity> page = notificationRepository.findAll(spec, pageable);

        Meta meta = new Meta();
        meta.setPage(page.getNumber() + 1);
        meta.setPageSize(page.getSize());
        meta.setPages(page.getTotalPages());
        meta.setTotal(page.getTotalElements());

        ResultPaginationDTO result = new ResultPaginationDTO();
        result.setMeta(meta);
        result.setResult(page.getContent());

        return result;
    }


}