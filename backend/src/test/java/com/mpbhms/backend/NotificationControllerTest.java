package com.mpbhms.backend;

import com.mpbhms.backend.controller.NotificationController;
import com.mpbhms.backend.dto.NotificationDTO;
import com.mpbhms.backend.entity.NotificationEntity;
import com.mpbhms.backend.service.NotificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.security.Principal;
import java.util.Arrays;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.*;

class NotificationControllerTest {

    @Mock
    private NotificationService notificationService;

    @Mock
    private Principal principal;

    @InjectMocks
    private NotificationController notificationController;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void createAndSend_ShouldReturnCreatedNotification() {
        // Arrange
        NotificationDTO request = new NotificationDTO();
        NotificationEntity expectedNotification = new NotificationEntity();
        when(notificationService.createAndSend(any(NotificationDTO.class))).thenReturn(expectedNotification);

        // Act
        ResponseEntity<NotificationEntity> response = notificationController.createAndSend(request);

        // Assert
        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertEquals(expectedNotification, response.getBody());
        verify(notificationService).createAndSend(request);
    }

    @Test
    void getUserNotifications_ShouldReturnListOfNotifications() {
        // Arrange
        String username = "testUser";
        when(principal.getName()).thenReturn(username);
        List<NotificationEntity> expectedNotifications = Arrays.asList(new NotificationEntity(), new NotificationEntity());
        when(notificationService.getUserNotifications(username)).thenReturn(expectedNotifications);

        // Act
        ResponseEntity<List<NotificationEntity>> response = notificationController.getUserNotifications(principal);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(expectedNotifications, response.getBody());
        verify(notificationService).getUserNotifications(username);
    }

    @Test
    void markAsRead_ShouldReturnOkStatus() {
        // Arrange
        Long notificationId = 1L;
        doNothing().when(notificationService).markAsRead(notificationId);

        // Act
        ResponseEntity<Void> response = notificationController.markAsRead(notificationId);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(notificationService).markAsRead(notificationId);
    }

    @Test
    void delete_ShouldReturnNoContentStatus() {
        // Arrange
        Long notificationId = 1L;
        doNothing().when(notificationService).deleteNotification(notificationId);

        // Act
        ResponseEntity<Void> response = notificationController.delete(notificationId);

        // Assert
        assertEquals(HttpStatus.NO_CONTENT, response.getStatusCode());
        verify(notificationService).deleteNotification(notificationId);
    }
}