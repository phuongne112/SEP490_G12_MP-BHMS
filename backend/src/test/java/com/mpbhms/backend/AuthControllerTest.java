package com.mpbhms.backend;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mpbhms.backend.controller.AuthController;
import com.mpbhms.backend.dto.CreateUserResponse;
import com.mpbhms.backend.dto.LoginDTO;
import com.mpbhms.backend.entity.Role;
import com.mpbhms.backend.entity.User;
import com.mpbhms.backend.exception.BusinessException;
import com.mpbhms.backend.response.LoginDTOResponse;
import com.mpbhms.backend.service.UserService;
import com.mpbhms.backend.util.SecurityUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.authentication.builders.AuthenticationManagerBuilder;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import com.mpbhms.backend.dto.CreateUserRequest;
import com.mpbhms.backend.response.CreateUserDTOResponse;

import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultHandlers.print;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
public class AuthControllerTest {

    private MockMvc mockMvc;

    @Mock
    private UserService userService;

    @Mock
    private AuthenticationManagerBuilder authenticationManagerBuilder;

    @Mock
    private SecurityUtil securityUtil;

    @Mock
    private PasswordEncoder passwordEncoder;

    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        mockMvc = MockMvcBuilders
                .standaloneSetup(
                        new AuthController(userService, authenticationManagerBuilder,
                                securityUtil, passwordEncoder))
                .build();
    }

    // **UNITTEST Login
    @Test
    public void testLoginSuccess() throws Exception {
        // Tạo DTO
        LoginDTO loginDTO = new LoginDTO();
        loginDTO.setUsername("test@gmail.com");
        loginDTO.setPassword("123123123aA@");

        // Mock Authentication
        Authentication authentication = mock(Authentication.class);
        when(authentication.getName()).thenReturn("test@gmail.com");

        // ✅ Mock AuthenticationManager
        AuthenticationManager authenticationManager = mock(AuthenticationManager.class);
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenReturn(authentication);

        // ✅ Gán AuthenticationManager cho builder.getObject()
        when(authenticationManagerBuilder.getObject()).thenReturn(authenticationManager);

        // Mock user trả về từ DB
        User mockUser = new User();
        mockUser.setId(1L);
        mockUser.setEmail("test@gmail.com");
        mockUser.setUsername("Admin");
        Role role = new Role();
        role.setId(1L);
        role.setRoleName("ADMIN");
        mockUser.setRole(role);

        when(userService.getUserWithEmail("test@gmail.com")).thenReturn(mockUser);

        // Mock tạo token
        when(securityUtil.createAccessToken(any(String.class), any(LoginDTOResponse.class)))
                .thenReturn("mockAccessToken");
        when(securityUtil.createRefreshToken(any(String.class), any(LoginDTOResponse.class)))
                .thenReturn("mockRefreshToken");

        mockMvc.perform(post("/mpbhms/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginDTO)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.access_token").value("mockAccessToken"))

                .andExpect(jsonPath("$.user.email").value("test@gmail.com"))
                .andExpect(cookie().value("refreshToken", "mockRefreshToken"));
    }

    // TC02: Invalid password
    @Test
    public void testLoginInvalidPassword() throws Exception {
        LoginDTO loginDTO = new LoginDTO();
        loginDTO.setUsername("test@gmail.com");
        loginDTO.setPassword("Valid123!");

        AuthenticationManager authenticationManager = mock(AuthenticationManager.class);
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenThrow(new BadCredentialsException("Bad credentials"));

        when(authenticationManagerBuilder.getObject()).thenReturn(authenticationManager);

        mockMvc.perform(post("/mpbhms/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginDTO)))
                .andDo(print())
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Invalid username or password"));
    }

    // TC03: Email not found
    @Test
    public void testLoginUserNotFound() throws Exception {
        LoginDTO loginDTO = new LoginDTO();
        loginDTO.setUsername("abc@gmail.com"); // email hợp lệ nhưng không tồn tại trong DB
        loginDTO.setPassword("123123123aA@");

        AuthenticationManager authenticationManager = mock(AuthenticationManager.class);
        when(authenticationManagerBuilder.getObject()).thenReturn(authenticationManager);

        // Gây BusinessException khi user = null
        when(userService.getUserWithEmail("abc@gmail.com"))
                .thenThrow(new com.mpbhms.backend.exception.BusinessException("User Not Found",
                        java.util.Map.of()));

        mockMvc.perform(post("/mpbhms/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginDTO)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("User Not Found"));
    }

    // TC04: Missing email
    @Test
    public void testLoginMissingEmail() throws Exception {
        LoginDTO loginDTO = new LoginDTO();
        loginDTO.setPassword("123123123aA@");

        mockMvc.perform(post("/mpbhms/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginDTO)))
                .andExpect(status().isBadRequest());
    }

    // TC05: Missing password
    @Test
    public void testLoginMissingPassword() throws Exception {
        LoginDTO loginDTO = new LoginDTO();
        loginDTO.setUsername("test@example.com");

        mockMvc.perform(post("/mpbhms/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginDTO)))
                .andExpect(status().isBadRequest());
    }

    // TC06: Missing all fields
    @Test
    public void testLoginMissingAll() throws Exception {
        LoginDTO loginDTO = new LoginDTO();

        mockMvc.perform(post("/mpbhms/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginDTO)))
                .andExpect(status().isBadRequest());
    }

    // **UNITTEST RESETPASSWORD
    // TC01: Reset password success
    @Test
    public void testResetPasswordSuccess() throws Exception {
        String token = "valid-reset-token";
        String newPassword = "NewPassword123!";
        // Prepare request body
        String requestBody = "{" +
                "\"token\": \"" + token + "\"," +
                "\"newPassword\": \"" + newPassword + "\"}";

        // No exception thrown means success
        doNothing().when(userService).resetPassword(token, newPassword);

        mockMvc.perform(post("/mpbhms/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody))
                .andExpect(status().isOk())
                .andExpect(content().string("Password reset successful."));
    }

    // TC02: Reset password with invalid token
    @Test
    public void testResetPasswordInvalidToken() throws Exception {
        String token = "invalid-token";
        String newPassword = "NewPassword123!";
        String requestBody = "{" +
                "\"token\": \"" + token + "\"," +
                "\"newPassword\": \"" + newPassword + "\"}";

        doThrow(new RuntimeException("Invalid token")).when(userService).resetPassword(token, newPassword);

        mockMvc.perform(post("/mpbhms/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody))
                .andDo(print()) // Print response for debugging
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Invalid token"));
    }

    // TC_03:Email tồn tại (exist@example.com)
    @Test
    public void testRequestReset_EmailMissing() throws Exception {
        String requestBody = "{}";

        mockMvc.perform(post("/mpbhms/auth/request-reset")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody))
                .andExpect(status().isBadRequest());
    }

    // TC_04:Email không tồn tại (nonexist@example.com)
    @Test
    public void testRequestReset_EmailEmpty() throws Exception {
        String requestBody = "{\"email\": \"\"}";

        mockMvc.perform(post("/mpbhms/auth/request-reset")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody))
                .andExpect(status().isBadRequest());
    }

    // TC_05:Email rỗng
    @Test
    public void testRequestReset_EmailExists() throws Exception {
        String email = "exist@example.com";
        String requestBody = "{\"email\": \"" + email + "\"}";

        when(userService.isEmailExist(email)).thenReturn(true);
        doNothing().when(userService).sendResetPasswordToken(email);

        mockMvc.perform(post("/mpbhms/auth/request-reset")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Reset link sent if email is registered."));
    }

    // TC_06:Không có trường email
    @Test
    public void testRequestReset_EmailNotExists() throws Exception {
        String email = "nonexist@example.com";
        String requestBody = "{\"email\": \"" + email + "\"}";

        when(userService.isEmailExist(email)).thenReturn(false);

        mockMvc.perform(post("/mpbhms/auth/request-reset")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Email not found in the system."));
    }

    @Test
    public void testSignUpSuccess() throws Exception {
        CreateUserRequest request = new CreateUserRequest();
        request.setUsername("newuser"); // >=3 ký tự
        request.setFullName("Nguyễn Văn A"); // hợp lệ
        request.setEmail("newuser@gmail.com"); // ✅ phải là gmail.com
        request.setPhone("0987654321"); // ✅ đúng định dạng 10 số
        request.setPassword("StrongPass1!"); // ✅ phải đáp ứng regex trong @Password

        User savedUser = new User();
        savedUser.setId(1L);
        savedUser.setUsername("newuser");
        savedUser.setEmail("newuser@gmail.com");

        when(userService.signUp(any(CreateUserRequest.class))).thenReturn(savedUser);
        when(userService.convertToCreateUserDTO(any(User.class)))
                .thenReturn(new CreateUserResponse());

        mockMvc.perform(post("/mpbhms/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(new ObjectMapper().writeValueAsString(request)))
                .andDo(print()) // để xem chi tiết nếu test fail
                .andExpect(status().isCreated());
    }

    @Test
    public void testSignUp_EmailExists() throws Exception {
        CreateUserRequest request = new CreateUserRequest();
        request.setUsername("NewUser");
        request.setFullName("New User Full Name");
        request.setEmail("ExistedEmail@example.com");
        request.setPhone("0987654321");
        request.setPassword("Password123@");

        lenient().when(userService.signUp(any(CreateUserRequest.class)))
                .thenThrow(new BusinessException("Email already exists"));

        mockMvc.perform(post("/mpbhms/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(new ObjectMapper().writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    public void testSignUp_UsernameExists() throws Exception {
        CreateUserRequest request = new CreateUserRequest();
        request.setUsername("ExistUsername");
        request.setFullName("New User Full Name");
        request.setEmail("existusername@gmail.com"); // Email hợp lệ!
        request.setPhone("0987654321");
        request.setPassword("Password123@");

        when(userService.signUp(any(CreateUserRequest.class)))
                .thenThrow(new BusinessException("Username already exists"));

        mockMvc.perform(post("/mpbhms/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(new ObjectMapper().writeValueAsString(request)))
                .andDo(print())
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Username already exists"));
    }

    @Test
    public void testSignUp_InvalidEmail() throws Exception {
        CreateUserRequest request = new CreateUserRequest();
        request.setUsername("NewUser");
        request.setFullName("New User Full Name");
        request.setEmail("new@aaaa"); // Email không hợp lệ
        request.setPhone("0987654321");
        request.setPassword("Password123@");

        mockMvc.perform(post("/mpbhms/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(new ObjectMapper().writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    public void testSignUp_MissingFields() throws Exception {
        CreateUserRequest request = new CreateUserRequest();
        // Không set email, username, password...

        mockMvc.perform(post("/mpbhms/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(new ObjectMapper().writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }
}
