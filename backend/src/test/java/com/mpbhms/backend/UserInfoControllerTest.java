package com.mpbhms.backend;

import com.mpbhms.backend.controller.UserInfoController;
import com.mpbhms.backend.dto.UserInfoDTO;
import com.mpbhms.backend.entity.UserInfoEntity;
import com.mpbhms.backend.service.UserInfoService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.time.Instant;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class UserInfoControllerTest {

    @Mock
    private UserInfoService userInfoService;

    @InjectMocks
    private UserInfoController userInfoController;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void createOrUpdateUserInfo_ShouldCreateNewUserInfo() {
        // Arrange
        UserInfoDTO request = new UserInfoDTO();
        request.setUserId(1L);
        request.setFullName("John Doe");
        request.setPhoneNumber("0123456789");
        request.setPhoneNumber2("0987654321");
        request.setGender(UserInfoEntity.Gender.Male);
        request.setBirthDate(Instant.now());
        request.setBirthPlace("New York");
        request.setNationalID("123456789");
        request.setNationalIDIssuePlace("New York");
        request.setPermanentAddress("123 Main St");

        UserInfoEntity savedEntity = new UserInfoEntity();
        savedEntity.setFullName(request.getFullName());
        savedEntity.setPhoneNumber(request.getPhoneNumber());
        savedEntity.setPhoneNumber2(request.getPhoneNumber2());
        savedEntity.setGender(request.getGender());
        savedEntity.setBirthDate(request.getBirthDate());
        savedEntity.setBirthPlace(request.getBirthPlace());
        savedEntity.setNationalID(request.getNationalID());
        savedEntity.setNationalIDIssuePlace(request.getNationalIDIssuePlace());
        savedEntity.setPermanentAddress(request.getPermanentAddress());

        UserInfoDTO response = new UserInfoDTO();
        response.setUserId(request.getUserId());
        response.setFullName(request.getFullName());
        response.setPhoneNumber(request.getPhoneNumber());
        response.setPhoneNumber2(request.getPhoneNumber2());
        response.setGender(request.getGender());
        response.setBirthDate(request.getBirthDate());
        response.setBirthPlace(request.getBirthPlace());
        response.setNationalID(request.getNationalID());
        response.setNationalIDIssuePlace(request.getNationalIDIssuePlace());
        response.setPermanentAddress(request.getPermanentAddress());

        when(userInfoService.saveOrUpdateUserInfo(any(UserInfoDTO.class))).thenReturn(savedEntity);
        when(userInfoService.convertToUserWithRoleDTO(any(UserInfoEntity.class))).thenReturn(response);

        // Act
        ResponseEntity<UserInfoDTO> responseEntity = userInfoController.createOrUpdateUserInfo(request);

        // Assert
        assertEquals(HttpStatus.CREATED, responseEntity.getStatusCode());
        assertNotNull(responseEntity.getBody());
        assertEquals(request.getUserId(), responseEntity.getBody().getUserId());
        assertEquals(request.getFullName(), responseEntity.getBody().getFullName());
        assertEquals(request.getPhoneNumber(), responseEntity.getBody().getPhoneNumber());
        verify(userInfoService).saveOrUpdateUserInfo(request);
        verify(userInfoService).convertToUserWithRoleDTO(savedEntity);
    }

    @Test
    void createOrUpdateUserInfo_WithInvalidData_ShouldHandleError() {
        // Arrange
        UserInfoDTO request = new UserInfoDTO();
        when(userInfoService.saveOrUpdateUserInfo(any(UserInfoDTO.class)))
                .thenThrow(new IllegalArgumentException("Invalid user info data"));

        // Act & Assert
        assertThrows(IllegalArgumentException.class, () -> userInfoController.createOrUpdateUserInfo(request));
        verify(userInfoService).saveOrUpdateUserInfo(request);
    }

    @Test
    void getUserInfo_ShouldReturnUserInfo() {
        // Arrange
        Long userId = 1L;
        UserInfoEntity userInfo = new UserInfoEntity();
        userInfo.setFullName("John Doe");
        userInfo.setPhoneNumber("0123456789");
        userInfo.setGender(UserInfoEntity.Gender.Male);

        UserInfoDTO response = new UserInfoDTO();
        response.setUserId(userId);
        response.setFullName(userInfo.getFullName());
        response.setPhoneNumber(userInfo.getPhoneNumber());
        response.setGender(userInfo.getGender());

        when(userInfoService.getUserInfoByUserId(userId)).thenReturn(userInfo);
        when(userInfoService.convertToUserWithRoleDTO(userInfo)).thenReturn(response);

        // Act
        ResponseEntity<UserInfoDTO> responseEntity = userInfoController.getUserInfo(userId);

        // Assert
        assertEquals(HttpStatus.OK, responseEntity.getStatusCode());
        assertNotNull(responseEntity.getBody());
        assertEquals(userId, responseEntity.getBody().getUserId());
        assertEquals(userInfo.getFullName(), responseEntity.getBody().getFullName());
        assertEquals(userInfo.getPhoneNumber(), responseEntity.getBody().getPhoneNumber());
        verify(userInfoService).getUserInfoByUserId(userId);
        verify(userInfoService).convertToUserWithRoleDTO(userInfo);
    }

    @Test
    void getUserInfo_WhenUserNotFound_ShouldHandleError() {
        // Arrange
        Long userId = 999L;
        when(userInfoService.getUserInfoByUserId(userId))
                .thenThrow(new IllegalArgumentException("User not found"));

        // Act & Assert
        assertThrows(IllegalArgumentException.class, () -> userInfoController.getUserInfo(userId));
        verify(userInfoService).getUserInfoByUserId(userId);
    }
}