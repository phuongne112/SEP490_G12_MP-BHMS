package com.mpbhms.backend.controller;

import com.mpbhms.backend.dto.NotificationDTO;
import com.mpbhms.backend.entity.NotificationEntity;
import com.mpbhms.backend.service.NotificationService;
import lombok.RequiredArgsConstructor;
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
    public ResponseEntity<NotificationEntity> createAndSend(@RequestBody NotificationDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(notificationService.createAndSend(request));
    }

    @GetMapping()
    public ResponseEntity<List<NotificationEntity>> getUserNotifications(Principal principal) {

        return ResponseEntity.ok(notificationService.getUserNotifications(principal.getName()));
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<Void> markAsRead(@PathVariable Long id) {
        notificationService.markAsRead(id);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        notificationService.deleteNotification(id);
        return ResponseEntity.noContent().build();
    }
}