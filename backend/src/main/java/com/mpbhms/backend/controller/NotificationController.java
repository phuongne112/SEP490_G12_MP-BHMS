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

    @GetMapping()
    @ApiMessage("Get all notifications for the current user")
    public ResponseEntity<List<Notification>> getUserNotifications(Principal principal) {
        return ResponseEntity.ok(notificationService.getUserNotifications(principal.getName()));
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