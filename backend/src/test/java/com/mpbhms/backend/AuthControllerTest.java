package com.mpbhms.backend;

import com.mpbhms.backend.controller.AuthController;
import com.mpbhms.backend.dto.*;
import com.mpbhms.backend.entity.Role;
import com.mpbhms.backend.entity.User;
import com.mpbhms.backend.exception.IdInvalidException;
import com.mpbhms.backend.response.ChangePasswordDTOResponse;
import com.mpbhms.backend.response.LoginDTOResponse;
import com.mpbhms.backend.service.UserService;
import com.mpbhms.backend.util.SecurityUtil;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.MockitoAnnotations;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.config.annotation.authentication.builders.AuthenticationManagerBuilder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.test.util.ReflectionTestUtils;

import java.security.Principal;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class AuthControllerTest {

    @Mock
    private UserService userService;

    @Mock
    private AuthenticationManagerBuilder authenticationManagerBuilder;

    @Mock
    private SecurityUtil securityUtil;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private AuthenticationManager authenticationManager;

    @Mock
    private Authentication authentication;

    @Mock
    private Principal principal;

    @InjectMocks
    private AuthController authController;

    private MockedStatic<SecurityUtil> mockedSecurityUtil;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        when(authenticationManagerBuilder.getObject()).thenReturn(authenticationManager);
        mockedSecurityUtil = mockStatic(SecurityUtil.class);
    }

    @AfterEach
    void tearDown() {
        mockedSecurityUtil.close();
    }

    @Test
    void login_Success() {
        // Arrange
        String userEmail = "test@example.com";
        String password = "password123";

        LoginDTO loginDTO = new LoginDTO();
        loginDTO.setUsername(userEmail);
        loginDTO.setPassword(password);

        Role role = new Role();
        role.setId(1L);
        role.setRoleName("RENTER");

        User mockUser = new User();
        mockUser.setId(1L);
        mockUser.setEmail(userEmail);
        mockUser.setUsername("Test User");
        mockUser.setRole(role);

        // Mock Authentication flow
        when(authenticationManagerBuilder.getObject()).thenReturn(authenticationManager);
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenReturn(authentication);
        when(authentication.getName()).thenReturn(userEmail);

        // Mock UserService and Token creation
        when(userService.getUserWithEmail(eq(userEmail))).thenReturn(mockUser);
        when(securityUtil.createAccessToken(eq(userEmail), any(LoginDTOResponse.class)))
                .thenReturn("mock.access.token");
        when(securityUtil.createRefreshToken(eq(userEmail), any(LoginDTOResponse.class)))
                .thenReturn("mock.refresh.token");

        // Inject refreshTokenExpiration manually if it's private
        ReflectionTestUtils.setField(authController, "refreshTokenExpiration", 3600L);

        // Act
        ResponseEntity<?> response = authController.login(loginDTO);

        // Assert
        assertNotNull(response);
        assertEquals(200, response.getStatusCodeValue());

        assertTrue(response.getBody() instanceof LoginDTOResponse);
        LoginDTOResponse body = (LoginDTOResponse) response.getBody();

        assertNotNull(body);
        assertEquals("mock.access.token", body.getAccessToken());
        assertNotNull(body.getUser());
        assertEquals(userEmail, body.getUser().getEmail());

        // Check refresh token in Set-Cookie header
        List<String> cookies = response.getHeaders().get(HttpHeaders.SET_COOKIE);
        assertNotNull(cookies);
        assertFalse(cookies.isEmpty());
        assertTrue(cookies.get(0).contains("refreshToken"));

        // Verify service and util method calls
        verify(userService).getUserWithEmail(eq(userEmail));
        verify(securityUtil).createAccessToken(eq(userEmail), any(LoginDTOResponse.class));
        verify(securityUtil).createRefreshToken(eq(userEmail), any(LoginDTOResponse.class));
        verify(userService).updateUserToken(anyString(), eq(userEmail));
    }

    @Test
    void login_UserNotFound() {
        // Arrange
        String userEmail = "nonexistent@example.com";
        LoginDTO loginDTO = new LoginDTO();
        loginDTO.setUsername(userEmail);
        loginDTO.setPassword("password123");

        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenReturn(authentication);
        when(authentication.getName()).thenReturn(userEmail);
        when(userService.getUserWithEmail(eq(userEmail))).thenReturn(null); // Không tìm thấy user

        // Act
        ResponseEntity<?> response = authController.login(loginDTO);

        // Assert
        assertNotNull(response);
        assertEquals(400, response.getStatusCodeValue()); // ✅ Expect 400 Bad Request
        assertTrue(response.getBody() instanceof Map);    // ✅ Body là Map
        Map<?, ?> body = (Map<?, ?>) response.getBody();
        assertEquals("User Not Found", body.get("message")); // ✅ Message đúng
    }

    @Test
    void getAccount_Success() {
        // Arrange
        String userEmail = "test@example.com";
        Role role = new Role();
        role.setId(1L);
        role.setRoleName("RENTER");

        User mockUser = new User();
        mockUser.setId(1L);
        mockUser.setEmail(userEmail);
        mockUser.setUsername("Test User");
        mockUser.setRole(role);

        mockedSecurityUtil.when(SecurityUtil::getCurrentUserLogin).thenReturn(Optional.of(userEmail));
        when(userService.getUserWithEmail(eq(userEmail))).thenReturn(mockUser);

        // Act
        ResponseEntity<LoginDTOResponse.UserGetAccount> response = authController.getAccount();

        // Assert
        assertNotNull(response);
        assertEquals(200, response.getStatusCodeValue());
        assertNotNull(response.getBody());
        assertNotNull(response.getBody().getUser());
        assertEquals(userEmail, response.getBody().getUser().getEmail());
    }

    @Test
    void getAccount_UserNotFound() {
        // Arrange
        String userEmail = "nonexistent@example.com";
        mockedSecurityUtil.when(SecurityUtil::getCurrentUserLogin).thenReturn(Optional.of(userEmail));
        when(userService.getUserWithEmail(eq(userEmail))).thenReturn(null);

        // Act
        ResponseEntity<LoginDTOResponse.UserGetAccount> response = authController.getAccount();

        // Assert
        assertNotNull(response);
        assertEquals(200, response.getStatusCodeValue());
        assertNotNull(response.getBody());
        assertNull(response.getBody().getUser());
    }

    @Test
    void getRefreshToken_Success() {
        // Arrange
        String userEmail = "test@example.com";
        String refreshToken = "valid.refresh.token";
        Role role = new Role();
        role.setId(1L);
        role.setRoleName("RENTER");

        User mockUser = new User();
        mockUser.setId(1L);
        mockUser.setEmail(userEmail);
        mockUser.setUsername("Test User");
        mockUser.setRole(role);

        when(securityUtil.checkValidRefreshToken(refreshToken)).thenReturn(mock(org.springframework.security.oauth2.jwt.Jwt.class));
        when(securityUtil.checkValidRefreshToken(refreshToken).getSubject()).thenReturn(userEmail);
        when(userService.getUserByRefreshTokenAndEmail(refreshToken, userEmail)).thenReturn(mockUser);
        when(securityUtil.createAccessToken(eq(userEmail), any(LoginDTOResponse.class)))
                .thenReturn("new.access.token");
        when(securityUtil.createRefreshToken(eq(userEmail), any(LoginDTOResponse.class)))
                .thenReturn("new.refresh.token");

        // Act
        ResponseEntity<LoginDTOResponse> response = authController.getRefreshToken(refreshToken);

        // Assert
        assertNotNull(response);
        assertEquals(200, response.getStatusCodeValue());
        assertNotNull(response.getBody());
        assertNotNull(response.getHeaders().get(HttpHeaders.SET_COOKIE));
        assertTrue(response.getHeaders().get(HttpHeaders.SET_COOKIE).get(0).contains("refreshToken"));
    }

    @Test
    void getRefreshToken_MissingToken() {
        // Act & Assert
        assertThrows(JwtException.class, () -> authController.getRefreshToken(null));
    }

    @Test
    void getRefreshToken_InvalidToken() {
        // Arrange
        String refreshToken = "invalid.token";
        when(securityUtil.checkValidRefreshToken(refreshToken)).thenThrow(new JwtException("Invalid token"));

        // Act & Assert
        assertThrows(JwtException.class, () -> authController.getRefreshToken(refreshToken));
    }

    @Test
    void logout_Success() {
        // Arrange
        String userEmail = "test@example.com";
        mockedSecurityUtil.when(SecurityUtil::getCurrentUserLogin).thenReturn(Optional.of(userEmail));

        // Act
        ResponseEntity<Void> response = authController.logout();

        // Assert
        assertNotNull(response);
        assertEquals(204, response.getStatusCodeValue());
        verify(userService).updateUserToken(null, userEmail);
    }

    @Test
    void logout_NoUser() {
        // Arrange
        mockedSecurityUtil.when(SecurityUtil::getCurrentUserLogin).thenReturn(Optional.empty());

        // Act & Assert
        assertThrows(JwtException.class, () -> authController.logout());
    }

    @Test
    void signUp_Success() {
        // Arrange
        CreateUserRequest request = new CreateUserRequest();
        request.setEmail("new@example.com");
        request.setUsername("New User");
        request.setPassword("Password123!");
        request.setFullName("New User Full Name");
        request.setPhone("1234567890");

        User savedUser = new User();
        savedUser.setId(1L);
        savedUser.setEmail(request.getEmail());
        savedUser.setUsername(request.getUsername());

        when(userService.isEmailExist(request.getEmail())).thenReturn(false);
        when(userService.signUp(request)).thenReturn(savedUser);
        when(userService.convertToCreateUserDTO(savedUser)).thenReturn(new CreateUserResponse());

        // Act
        ResponseEntity<CreateUserResponse> response = authController.signUp(request);

        // Assert
        assertNotNull(response);
        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertNotNull(response.getBody());
    }

    @Test
    void signUp_EmailExists() {
        // Arrange
        CreateUserRequest request = new CreateUserRequest();
        request.setEmail("existing@example.com");
        when(userService.isEmailExist(request.getEmail())).thenReturn(true);

        // Act & Assert
        assertThrows(IdInvalidException.class, () -> authController.signUp(request));
    }

    @Test
    void changePassword_Success() {
        // Arrange
        String userEmail = "test@example.com";
        ChangePasswordDTO request = new ChangePasswordDTO();
        request.setCurrentPassword("oldPass123!");
        request.setNewPassword("newPass123!");

        when(principal.getName()).thenReturn(userEmail);
        when(userService.changePasswordUser(userEmail, request.getCurrentPassword(), request.getNewPassword()))
                .thenReturn("Password changed successfully");

        // Act
        ResponseEntity<ChangePasswordDTOResponse> response = authController.changePassword(request, principal);

        // Assert
        assertNotNull(response);
        assertEquals(200, response.getStatusCodeValue());
        assertNotNull(response.getBody());
        assertEquals("Password changed successfully", response.getBody().getMessage());
    }

    @Test
    void requestReset_Success() {
        // Arrange
        ResetRequestDTO request = new ResetRequestDTO();
        request.setEmail("test@example.com");

        // Act
        ResponseEntity<?> response = authController.requestReset(request);

        // Assert
        assertNotNull(response);
        assertEquals(200, response.getStatusCodeValue());
        verify(userService).sendResetPasswordToken(request.getEmail());
    }

    @Test
    void resetPassword_Success() {
        // Arrange
        ResetPasswordDTO request = new ResetPasswordDTO();
        request.setToken("valid.token");
        request.setNewPassword("newPass123!");

        // Act
        ResponseEntity<?> response = authController.resetPassword(request);

        // Assert
        assertNotNull(response);
        assertEquals(200, response.getStatusCodeValue());
        verify(userService).resetPassword(request.getToken(), request.getNewPassword());
    }
}