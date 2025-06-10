package com.mpbhms.backend;

import com.mpbhms.backend.controller.UserController;
import com.mpbhms.backend.dto.*;
import com.mpbhms.backend.entity.UserEntity;
import com.mpbhms.backend.exception.IdInvalidException;
import com.mpbhms.backend.service.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Instant;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class UserControllerTest {

    @Mock
    private UserService userService;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private UserController userController;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void getAllUsers_ShouldReturnPaginatedResult() {
        // Arrange
        Specification<UserEntity> spec = mock(Specification.class);
        Pageable pageable = PageRequest.of(0, 10);
        ResultPaginationDTO expectedResult = new ResultPaginationDTO();
        when(userService.getAllUsers(any(), any())).thenReturn(expectedResult);

        // Act
        ResponseEntity<ResultPaginationDTO> response = userController.getAllUsers(spec, pageable);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(expectedResult, response.getBody());
        verify(userService).getAllUsers(spec, pageable);
    }

    @Test
    void createNewUser_WhenEmailDoesNotExist_ShouldCreateUser() {
        // Arrange
        CreateUserRequest request = new CreateUserRequest();
        request.setEmail("test@example.com");
        request.setUsername("testuser");
        request.setPassword("Test@123");
        request.setFullName("Test User");
        request.setPhone("1234567890");

        UserEntity savedUser = new UserEntity();
        savedUser.setEmail(request.getEmail());
        savedUser.setUsername(request.getUsername());
        savedUser.setIsActive(true);

        CreateUserResponse expectedResponse = new CreateUserResponse();
        expectedResponse.setEmail(savedUser.getEmail());
        expectedResponse.setUsername(savedUser.getUsername());
        expectedResponse.setIsActive(true);
        expectedResponse.setCreatedDate(Instant.now());

        when(userService.isEmailExist(request.getEmail())).thenReturn(false);
        when(userService.CreateUser(request)).thenReturn(savedUser);
        when(userService.convertToCreateUserDTO(savedUser)).thenReturn(expectedResponse);

        // Act
        ResponseEntity<CreateUserResponse> response = userController.createNewUser(request);

        // Assert
        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(expectedResponse.getEmail(), response.getBody().getEmail());
        assertEquals(expectedResponse.getUsername(), response.getBody().getUsername());
        verify(userService).isEmailExist(request.getEmail());
        verify(userService).CreateUser(request);
        verify(userService).convertToCreateUserDTO(savedUser);
    }

    @Test
    void createNewUser_WhenEmailExists_ShouldThrowException() {
        // Arrange
        CreateUserRequest request = new CreateUserRequest();
        request.setEmail("existing@example.com");

        when(userService.isEmailExist(request.getEmail())).thenReturn(true);

        // Act & Assert
        assertThrows(IdInvalidException.class, () -> userController.createNewUser(request));
        verify(userService).isEmailExist(request.getEmail());
        verify(userService, never()).CreateUser(any());
    }

    @Test
    void updateUser_WhenUserExistsAndEmailValid_ShouldUpdateUser() throws IdInvalidException {
        // Arrange
        UserEntity userToUpdate = new UserEntity();
        userToUpdate.setId(1L);
        userToUpdate.setEmail("test@example.com");
        userToUpdate.setUsername("updateduser");

        UpdateUserDTO expectedResponse = new UpdateUserDTO();
        expectedResponse.setEmail(userToUpdate.getEmail());
        expectedResponse.setUsername(userToUpdate.getUsername());
        expectedResponse.setIsActive(true);
        expectedResponse.setUpdatedDate(Instant.now());

        when(userService.isEmailExist(userToUpdate.getEmail())).thenReturn(true);
        when(userService.handleFetchUserById(userToUpdate.getId())).thenReturn(userToUpdate);
        when(userService.handleUpdateUser(userToUpdate)).thenReturn(userToUpdate);
        when(userService.convertResUpdateUserDTO(userToUpdate)).thenReturn(expectedResponse);

        // Act
        ResponseEntity<UpdateUserDTO> response = userController.updateUser(userToUpdate);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(expectedResponse.getEmail(), response.getBody().getEmail());
        assertEquals(expectedResponse.getUsername(), response.getBody().getUsername());
        verify(userService).handleUpdateUser(userToUpdate);
    }

    @Test
    void updateUser_WhenUserDoesNotExist_ShouldThrowException() {
        // Arrange
        UserEntity userToUpdate = new UserEntity();
        userToUpdate.setId(999L);
        userToUpdate.setEmail("nonexistent@example.com");

        when(userService.isEmailExist(userToUpdate.getEmail())).thenReturn(false);
        when(userService.handleFetchUserById(userToUpdate.getId())).thenReturn(null);

        // Act & Assert
        assertThrows(IdInvalidException.class, () -> userController.updateUser(userToUpdate));
        verify(userService).handleFetchUserById(userToUpdate.getId());
        verify(userService, never()).handleUpdateUser(any());
    }

    @Test
    void updateUserStatus_ShouldUpdateStatus() {
        // Arrange
        Long userId = 1L;
        UpdateUserStatusRequest request = new UpdateUserStatusRequest();
        request.setActive(true);

        doNothing().when(userService).updateUserStatus(userId, request.isActive());

        // Act
        ResponseEntity<Void> response = userController.updateUserStatus(userId, request);

        // Assert
        assertEquals(HttpStatus.NO_CONTENT, response.getStatusCode());
        verify(userService).updateUserStatus(userId, request.isActive());
    }

    @Test
    void updateUserStatus_WhenUserDoesNotExist_ShouldHandleException() {
        // Arrange
        Long nonExistentId = 999L;
        UpdateUserStatusRequest request = new UpdateUserStatusRequest();
        request.setActive(true);

        doThrow(new IdInvalidException("User not found"))
                .when(userService).updateUserStatus(nonExistentId, request.isActive());

        // Act & Assert
        assertThrows(IdInvalidException.class, () ->
                userController.updateUserStatus(nonExistentId, request));
        verify(userService).updateUserStatus(nonExistentId, request.isActive());
    }
}