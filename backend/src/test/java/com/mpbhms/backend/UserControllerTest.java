package com.mpbhms.backend;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mpbhms.backend.controller.UserController;
import com.mpbhms.backend.dto.*;
import com.mpbhms.backend.entity.User;
import com.mpbhms.backend.service.UserService;
import com.mpbhms.backend.util.SecurityUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;

import java.time.Instant;
import java.util.List;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.mockito.ArgumentMatchers.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;

@WebMvcTest(UserController.class)
@AutoConfigureMockMvc(addFilters = false) // Tắt security filter
@Import(SecurityUtil.class)
public class UserControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private PasswordEncoder passwordEncoder;

    @MockBean
    private SecurityUtil securityUtil;

    @MockBean
    private UserService userService;

    @BeforeEach
    public void setup() {
        Meta meta = new Meta(1, 1, 1, 1L);

        ResultPaginationDTO dto = new ResultPaginationDTO();
        dto.setMeta(meta);
        dto.setResult(List.of());

        when(userService.getAllUsers(any(), any())).thenReturn(dto);
    }

    @Test
    public void testGetAllUsers() throws Exception {
        mockMvc.perform(MockMvcRequestBuilders.get("/mpbhms/users"))
                .andExpect(status().isOk());
    }

    @Test
    public void testCreateNewUser() throws Exception {
        CreateUserRequest request = new CreateUserRequest();
        request.setFullName("John Doe");
        request.setEmail("john@gmail.com"); // ✅ hợp lệ với @Gmail
        request.setPassword("Password123!"); // ✅ hợp lệ với @Password
        request.setPhone("0912345678"); // ✅ hợp lệ với @Phone

        User user = new User();
        user.setId(1L);

        CreateUserResponse response = new CreateUserResponse();
        response.setUsername("john.doe");
        response.setEmail("john@gmail.com");
        response.setIsActive(true);
        response.setCreatedDate(Instant.now());
        response.setRoleId(2L);

        when(userService.createUser(any())).thenReturn(user);
        when(userService.convertToCreateUserDTO(any())).thenReturn(response);

        mockMvc.perform(MockMvcRequestBuilders.post("/mpbhms/users")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.username").value("john.doe"))
                .andExpect(jsonPath("$.data.email").value("john@gmail.com"))
                .andExpect(jsonPath("$.data.isActive").value(true))
                .andExpect(jsonPath("$.data.roleId").value(2));
    }

    @Test
    public void testUpdateUserStatus() throws Exception {
        UpdateUserStatusRequest request = new UpdateUserStatusRequest();
        request.setActive(true);

        User mockUser = new User();
        mockUser.setId(1L);

        when(userService.handleFetchUserById(1L)).thenReturn(mockUser);
        Mockito.doNothing().when(userService).updateUserStatus(eq(1L), eq(true));

        mockMvc.perform(MockMvcRequestBuilders.put("/mpbhms/users/1/active")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNoContent());
    }
}
