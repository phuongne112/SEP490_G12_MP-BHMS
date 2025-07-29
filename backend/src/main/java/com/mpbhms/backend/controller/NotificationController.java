package com.mpbhms.backend.controller;

import com.mpbhms.backend.dto.NotificationDTO;
import com.mpbhms.backend.dto.ResultPaginationDTO;
import com.mpbhms.backend.entity.Notification;
import com.mpbhms.backend.service.NotificationService;
import com.mpbhms.backend.util.ApiMessage;
import com.turkraft.springfilter.boot.Filter;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/mpbhms/notifications")
@RequiredArgsConstructor
public class NotificationController {
    private final NotificationService notificationService;

    @PostMapping("/send")
    @ApiMessage("Create and send a new notification")
    public ResponseEntity<Notification> createAndSend(@RequestBody NotificationDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(notificationService.createAndSend(request));
    }

    @PostMapping("/send-multiple")
    @ApiMessage("Create and send notifications to multiple users")
    public ResponseEntity<List<Notification>> createAndSendMultiple(@RequestBody NotificationDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(notificationService.createAndSendMultiple(request));
    }

    @GetMapping()
    @ApiMessage("Get all notifications for the current user")
    public ResponseEntity<List<NotificationDTO>> getUserNotifications(Principal principal) {
        List<Notification> notifications = notificationService.getUserNotifications(principal.getName());
        List<NotificationDTO> dtos = notifications.stream().map(n -> {
            NotificationDTO dto = new NotificationDTO();
            dto.setId(n.getId());
            dto.setTitle(n.getTitle());
            dto.setMessage(n.getMessage());
            dto.setType(n.getType());
            dto.setDisplayType(n.getType() != null ? n.getType().getDisplayName() : null);
            dto.setRecipientId(n.getRecipientId());
            dto.setMetadata(n.getMetadata());
            dto.setCreatedDate(n.getCreatedDate());
            dto.setStatus(n.getStatus());
            dto.setDisplayStatus(n.getStatus() != null ? n.getStatus().getDisplayName() : null);
            return dto;
        }).toList();
        return ResponseEntity.ok(dtos);
    }

    @GetMapping("/all")
    @ApiMessage("Get all notifications with filters and pagination (admin only)")
    public ResponseEntity<ResultPaginationDTO> getAllNotifications(
            @Filter Specification<Notification> spec,
            Pageable pageable
    ) {
        return ResponseEntity.ok(notificationService.getAllNotifications(spec, pageable));
    }


    @PutMapping("/{id}/read")
    @ApiMessage("Mark a notification as read")
    public ResponseEntity<Void> markAsRead(@PathVariable Long id) {
        notificationService.markAsRead(id);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}")
    @ApiMessage("Delete a notification by ID")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        notificationService.deleteNotification(id);
        return ResponseEntity.noContent().build();
    }
}