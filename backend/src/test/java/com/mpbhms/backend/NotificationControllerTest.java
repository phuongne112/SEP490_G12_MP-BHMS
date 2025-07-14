package com.mpbhms.backend;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mpbhms.backend.controller.NotificationController;
import com.mpbhms.backend.dto.NotificationDTO;
import com.mpbhms.backend.dto.Meta;
import com.mpbhms.backend.dto.ResultPaginationDTO;
import com.mpbhms.backend.entity.Notification;
import com.mpbhms.backend.enums.NotificationStatus;
import com.mpbhms.backend.enums.NotificationType;
import com.mpbhms.backend.exception.BusinessException;
import com.mpbhms.backend.exception.GlobalExceptionHandler;
import com.mpbhms.backend.exception.ResourceNotFoundException;
import com.mpbhms.backend.service.NotificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.bind.support.WebDataBinderFactory;

import java.security.Principal;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultHandlers.print;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
public class NotificationControllerTest {

    private MockMvc mockMvc;

    @Mock
    private NotificationService notificationService;

    @Mock
    private Principal principal;

    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        mockMvc = MockMvcBuilders
                .standaloneSetup(new NotificationController(notificationService))
                .setControllerAdvice(new GlobalExceptionHandler())
                .setCustomArgumentResolvers(
                        new SpecificationArgumentResolver(),
                        new org.springframework.data.web.PageableHandlerMethodArgumentResolver(),
                        new PrincipalArgumentResolver())
                .build();
    }

    // Custom argument resolver để handle Specification parameter
    private static class SpecificationArgumentResolver implements HandlerMethodArgumentResolver {
        @Override
        public boolean supportsParameter(org.springframework.core.MethodParameter parameter) {
            return parameter.getParameterType().equals(Specification.class);
        }

        @Override
        public Object resolveArgument(org.springframework.core.MethodParameter parameter,
                ModelAndViewContainer mavContainer,
                NativeWebRequest webRequest,
                WebDataBinderFactory binderFactory) {
            // Return a simple specification that always returns true (no filtering)
            return (Specification<Object>) (root, query, criteriaBuilder) -> criteriaBuilder.conjunction();
        }
    }

    // Custom argument resolver để handle Principal parameter
    private static class PrincipalArgumentResolver implements HandlerMethodArgumentResolver {
        @Override
        public boolean supportsParameter(org.springframework.core.MethodParameter parameter) {
            return parameter.getParameterType().equals(Principal.class);
        }

        @Override
        public Object resolveArgument(org.springframework.core.MethodParameter parameter,
                ModelAndViewContainer mavContainer,
                NativeWebRequest webRequest,
                WebDataBinderFactory binderFactory) {
            // Return a mock principal
            return new Principal() {
                @Override
                public String getName() {
                    return "test@example.com";
                }
            };
        }
    }

    // **UNITTEST CREATE AND SEND NOTIFICATION
    @Test
    public void testCreateAndSendNotificationSuccess() throws Exception {
        // Arrange
        NotificationDTO request = new NotificationDTO();
        request.setTitle("Test Notification");
        request.setMessage("This is a test notification");
        request.setType(NotificationType.ANNOUNCEMENT);
        request.setRecipientId(1L);

        Notification createdNotification = new Notification();
        createdNotification.setId(1L);
        createdNotification.setTitle("Test Notification");
        createdNotification.setMessage("This is a test notification");
        createdNotification.setType(NotificationType.ANNOUNCEMENT);
        createdNotification.setStatus(NotificationStatus.SENT);
        createdNotification.setRecipientId(1L);
        createdNotification.setCreatedDate(Instant.now());

        when(notificationService.createAndSend(any(NotificationDTO.class))).thenReturn(createdNotification);

        // Act & Assert
        mockMvc.perform(post("/mpbhms/notifications/send")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andDo(print())
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.title").value("Test Notification"))
                .andExpect(jsonPath("$.message").value("This is a test notification"))
                .andExpect(jsonPath("$.type").value("ANNOUNCEMENT"))
                .andExpect(jsonPath("$.status").value("SENT"));

        verify(notificationService, times(1)).createAndSend(any(NotificationDTO.class));
    }

    @Test
    public void testCreateAndSendNotificationWithEmptyBody() throws Exception {
        // Act & Assert
        mockMvc.perform(post("/mpbhms/notifications/send")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
                .andDo(print())
                .andExpect(status().isCreated());
    }

    @Test
    public void testCreateAndSendNotificationWithServiceException() throws Exception {
        // Arrange
        NotificationDTO request = new NotificationDTO();
        request.setTitle("Test Notification");

        when(notificationService.createAndSend(any(NotificationDTO.class)))
                .thenThrow(new RuntimeException("Failed to send notification"));

        // Act & Assert
        mockMvc.perform(post("/mpbhms/notifications/send")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andDo(print())
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Failed to send notification"));

        verify(notificationService, times(1)).createAndSend(any(NotificationDTO.class));
    }

    // **UNITTEST GET USER NOTIFICATIONS
    @Test
    public void testGetUserNotificationsSuccess() throws Exception {
        // Arrange
        Notification notification1 = new Notification();
        notification1.setId(1L);
        notification1.setTitle("Notification 1");
        notification1.setStatus(NotificationStatus.SENT);

        Notification notification2 = new Notification();
        notification2.setId(2L);
        notification2.setTitle("Notification 2");
        notification2.setStatus(NotificationStatus.READ);

        List<Notification> notifications = Arrays.asList(notification1, notification2);

        // Mock service với any String thay vì dựa vào Principal
        when(notificationService.getUserNotifications(any(String.class))).thenReturn(notifications);

        // Act & Assert
        mockMvc.perform(get("/mpbhms/notifications").principal(() -> "test@example.com"))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].id").value(1))
                .andExpect(jsonPath("$[0].title").value("Notification 1"))
                .andExpect(jsonPath("$[1].id").value(2))
                .andExpect(jsonPath("$[1].title").value("Notification 2"));

        verify(notificationService, times(1)).getUserNotifications(any(String.class));
    }

    @Test
    public void testGetUserNotificationsEmpty() throws Exception {
        // Arrange
        when(notificationService.getUserNotifications(any(String.class))).thenReturn(Arrays.asList());

        // Act & Assert
        mockMvc.perform(get("/mpbhms/notifications").principal(() -> "test@example.com"))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(0));

        verify(notificationService, times(1)).getUserNotifications(any(String.class));
    }

    @Test
    public void testGetUserNotificationsWithServiceException() throws Exception {
        // Arrange
        when(notificationService.getUserNotifications(any(String.class)))
                .thenThrow(new RuntimeException("Database connection failed"));

        // Act & Assert
        mockMvc.perform(get("/mpbhms/notifications").principal(() -> "test@example.com"))
                .andDo(print())
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Database connection failed"));

        verify(notificationService, times(1)).getUserNotifications("test@example.com");
    }

    // **UNITTEST GET ALL NOTIFICATIONS (ADMIN)
    @Test
    public void testGetAllNotificationsSuccess() throws Exception {
        // Arrange
        Notification notification1 = new Notification();
        notification1.setId(1L);
        notification1.setTitle("Admin Notification 1");
        notification1.setStatus(NotificationStatus.SENT);

        Notification notification2 = new Notification();
        notification2.setId(2L);
        notification2.setTitle("Admin Notification 2");
        notification2.setStatus(NotificationStatus.READ);

        List<Notification> notifications = Arrays.asList(notification1, notification2);

        Meta meta = new Meta();
        meta.setPage(1);
        meta.setPageSize(10);
        meta.setPages(1);
        meta.setTotal(2L);

        ResultPaginationDTO result = new ResultPaginationDTO();
        result.setMeta(meta);
        result.setResult(notifications);

        when(notificationService.getAllNotifications(any(Specification.class), any(Pageable.class)))
                .thenReturn(result);

        // Act & Assert
        mockMvc.perform(get("/mpbhms/notifications/all")
                .param("page", "0")
                .param("size", "10"))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result").isArray())
                .andExpect(jsonPath("$.result.length()").value(2))
                .andExpect(jsonPath("$.meta.total").value(2))
                .andExpect(jsonPath("$.meta.pages").value(1))
                .andExpect(jsonPath("$.result[0].id").value(1))
                .andExpect(jsonPath("$.result[1].id").value(2));

        verify(notificationService, times(1)).getAllNotifications(any(Specification.class), any(Pageable.class));
    }

    @Test
    public void testGetAllNotificationsWithFilters() throws Exception {
        // Arrange
        Notification notification = new Notification();
        notification.setId(1L);
        notification.setTitle("Filtered Notification");
        notification.setStatus(NotificationStatus.SENT);

        List<Notification> notifications = Arrays.asList(notification);

        Meta meta = new Meta();
        meta.setPage(1);
        meta.setPageSize(10);
        meta.setPages(1);
        meta.setTotal(1L);

        ResultPaginationDTO result = new ResultPaginationDTO();
        result.setMeta(meta);
        result.setResult(notifications);

        when(notificationService.getAllNotifications(any(Specification.class), any(Pageable.class)))
                .thenReturn(result);

        // Act & Assert
        mockMvc.perform(get("/mpbhms/notifications/all")
                .param("page", "0")
                .param("size", "10")
                .param("status", "SENT")
                .param("type", "ANNOUNCEMENT"))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result").isArray())
                .andExpect(jsonPath("$.result.length()").value(1))
                .andExpect(jsonPath("$.meta.total").value(1));

        verify(notificationService, times(1)).getAllNotifications(any(Specification.class), any(Pageable.class));
    }

    @Test
    public void testGetAllNotificationsEmpty() throws Exception {
        // Arrange
        Meta meta = new Meta();
        meta.setPage(1);
        meta.setPageSize(10);
        meta.setPages(0);
        meta.setTotal(0L);

        ResultPaginationDTO result = new ResultPaginationDTO();
        result.setMeta(meta);
        result.setResult(Arrays.asList());

        when(notificationService.getAllNotifications(any(Specification.class), any(Pageable.class)))
                .thenReturn(result);

        // Act & Assert
        mockMvc.perform(get("/mpbhms/notifications/all")
                .param("page", "0")
                .param("size", "10"))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result").isArray())
                .andExpect(jsonPath("$.result.length()").value(0))
                .andExpect(jsonPath("$.meta.total").value(0));

        verify(notificationService, times(1)).getAllNotifications(any(Specification.class), any(Pageable.class));
    }

    // **UNITTEST MARK AS READ
    @Test
    public void testMarkAsReadSuccess() throws Exception {
        // Arrange
        Long notificationId = 1L;
        doNothing().when(notificationService).markAsRead(notificationId);

        // Act & Assert
        mockMvc.perform(put("/mpbhms/notifications/{id}/read", notificationId))
                .andDo(print())
                .andExpect(status().isOk());

        verify(notificationService, times(1)).markAsRead(notificationId);
    }

    @Test
    public void testMarkAsReadNotFound() throws Exception {
        // Arrange
        Long notificationId = 999L;
        doThrow(new ResourceNotFoundException("Notification not found"))
                .when(notificationService).markAsRead(notificationId);

        // Act & Assert
        mockMvc.perform(put("/mpbhms/notifications/{id}/read", notificationId))
                .andDo(print())
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Notification not found"));

        verify(notificationService, times(1)).markAsRead(notificationId);
    }

    @Test
    public void testMarkAsReadWithInvalidId() throws Exception {
        // Act & Assert
        mockMvc.perform(put("/mpbhms/notifications/{id}/read", "invalid"))
                .andDo(print())
                .andExpect(status().isBadRequest());
    }

    @Test
    public void testMarkAsReadWithServiceException() throws Exception {
        // Arrange
        Long notificationId = 1L;
        doThrow(new RuntimeException("Update failed"))
                .when(notificationService).markAsRead(notificationId);

        // Act & Assert
        mockMvc.perform(put("/mpbhms/notifications/{id}/read", notificationId))
                .andDo(print())
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Update failed"));

        verify(notificationService, times(1)).markAsRead(notificationId);
    }

    // **UNITTEST DELETE NOTIFICATION
    @Test
    public void testDeleteNotificationSuccess() throws Exception {
        // Arrange
        Long notificationId = 1L;
        doNothing().when(notificationService).deleteNotification(notificationId);

        // Act & Assert
        mockMvc.perform(delete("/mpbhms/notifications/{id}", notificationId))
                .andDo(print())
                .andExpect(status().isNoContent());

        verify(notificationService, times(1)).deleteNotification(notificationId);
    }

    @Test
    public void testDeleteNotificationNotFound() throws Exception {
        // Arrange
        Long notificationId = 999L;
        doThrow(new ResourceNotFoundException("Notification not found"))
                .when(notificationService).deleteNotification(notificationId);

        // Act & Assert
        mockMvc.perform(delete("/mpbhms/notifications/{id}", notificationId))
                .andDo(print())
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Notification not found"));

        verify(notificationService, times(1)).deleteNotification(notificationId);
    }

    @Test
    public void testDeleteNotificationWithInvalidId() throws Exception {
        // Act & Assert
        mockMvc.perform(delete("/mpbhms/notifications/{id}", "invalid"))
                .andDo(print())
                .andExpect(status().isBadRequest());
    }

    @Test
    public void testDeleteNotificationWithServiceException() throws Exception {
        // Arrange
        Long notificationId = 1L;
        doThrow(new RuntimeException("Delete failed"))
                .when(notificationService).deleteNotification(notificationId);

        // Act & Assert
        mockMvc.perform(delete("/mpbhms/notifications/{id}", notificationId))
                .andDo(print())
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Delete failed"));

        verify(notificationService, times(1)).deleteNotification(notificationId);
    }

    // **UNITTEST EDGE CASES
    @Test
    public void testCreateAndSendNotificationWithNullValues() throws Exception {
        // Arrange
        NotificationDTO request = new NotificationDTO();
        // Không set bất kỳ giá trị nào

        Notification createdNotification = new Notification();
        createdNotification.setId(1L);

        when(notificationService.createAndSend(any(NotificationDTO.class))).thenReturn(createdNotification);

        // Act & Assert
        mockMvc.perform(post("/mpbhms/notifications/send")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andDo(print())
                .andExpect(status().isCreated());

        verify(notificationService, times(1)).createAndSend(any(NotificationDTO.class));
    }

    @Test
    public void testCreateAndSendNotificationWithVeryLongValues() throws Exception {
        // Arrange
        String longTitle = "A".repeat(1000);
        String longMessage = "B".repeat(2000);

        NotificationDTO request = new NotificationDTO();
        request.setTitle(longTitle);
        request.setMessage(longMessage);
        request.setType(NotificationType.ANNOUNCEMENT);

        Notification createdNotification = new Notification();
        createdNotification.setId(1L);
        createdNotification.setTitle(longTitle);
        createdNotification.setMessage(longMessage);
        createdNotification.setType(NotificationType.ANNOUNCEMENT);

        when(notificationService.createAndSend(any(NotificationDTO.class))).thenReturn(createdNotification);

        // Act & Assert
        mockMvc.perform(post("/mpbhms/notifications/send")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andDo(print())
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.title").value(longTitle))
                .andExpect(jsonPath("$.message").value(longMessage));

        verify(notificationService, times(1)).createAndSend(any(NotificationDTO.class));
    }

    @Test
    public void testCreateAndSendNotificationWithSpecialCharacters() throws Exception {
        // Arrange
        NotificationDTO request = new NotificationDTO();
        request.setTitle("Notification với ký tự đặc biệt @#$%^&*()");
        request.setMessage("Message với emoji 😀 và ký tự Unicode");
        request.setType(NotificationType.ANNOUNCEMENT);

        Notification createdNotification = new Notification();
        createdNotification.setId(1L);
        createdNotification.setTitle("Notification với ký tự đặc biệt @#$%^&*()");
        createdNotification.setMessage("Message với emoji 😀 và ký tự Unicode");
        createdNotification.setType(NotificationType.ANNOUNCEMENT);

        when(notificationService.createAndSend(any(NotificationDTO.class))).thenReturn(createdNotification);

        // Act & Assert
        mockMvc.perform(post("/mpbhms/notifications/send")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andDo(print())
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.title").value("Notification với ký tự đặc biệt @#$%^&*()"))
                .andExpect(jsonPath("$.message").value("Message với emoji 😀 và ký tự Unicode"));

        verify(notificationService, times(1)).createAndSend(any(NotificationDTO.class));
    }

    @Test
    public void testGetAllNotificationsWithoutPagination() throws Exception {
        // Arrange
        Notification notification = new Notification();
        notification.setId(1L);
        notification.setTitle("Test Notification");

        List<Notification> notifications = Arrays.asList(notification);

        Meta meta = new Meta();
        meta.setPage(1);
        meta.setPageSize(20); // Default size
        meta.setPages(1);
        meta.setTotal(1L);

        ResultPaginationDTO result = new ResultPaginationDTO();
        result.setMeta(meta);
        result.setResult(notifications);

        when(notificationService.getAllNotifications(any(Specification.class), any(Pageable.class)))
                .thenReturn(result);

        // Act & Assert
        mockMvc.perform(get("/mpbhms/notifications/all"))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result").isArray())
                .andExpect(jsonPath("$.result.length()").value(1))
                .andExpect(jsonPath("$.meta.total").value(1));

        verify(notificationService, times(1)).getAllNotifications(any(Specification.class), any(Pageable.class));
    }

    @Test
    public void testGetAllNotificationsWithLargePageSize() throws Exception {
        // Arrange
        List<Notification> notifications = new java.util.ArrayList<>();
        for (int i = 1; i <= 50; i++) {
            Notification notification = new Notification();
            notification.setId((long) i);
            notification.setTitle("Notification " + i);
            notifications.add(notification);
        }

        Meta meta = new Meta();
        meta.setPage(1);
        meta.setPageSize(50);
        meta.setPages(1);
        meta.setTotal(50L);

        ResultPaginationDTO result = new ResultPaginationDTO();
        result.setMeta(meta);
        result.setResult(notifications);

        when(notificationService.getAllNotifications(any(Specification.class), any(Pageable.class)))
                .thenReturn(result);

        // Act & Assert
        mockMvc.perform(get("/mpbhms/notifications/all")
                .param("page", "0")
                .param("size", "50"))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result").isArray())
                .andExpect(jsonPath("$.result.length()").value(50))
                .andExpect(jsonPath("$.meta.total").value(50))
                .andExpect(jsonPath("$.meta.pageSize").value(50));

        verify(notificationService, times(1)).getAllNotifications(any(Specification.class), any(Pageable.class));
    }
}