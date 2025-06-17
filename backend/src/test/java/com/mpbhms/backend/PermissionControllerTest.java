package com.mpbhms.backend;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mpbhms.backend.controller.PermissionController;
import com.mpbhms.backend.dto.PermissionRequestDTO;
import com.mpbhms.backend.entity.Permission;
import com.mpbhms.backend.exception.BusinessException;
import com.mpbhms.backend.service.PermissionService;
import com.mpbhms.backend.service.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.boot.test.mock.mockito.MockBean;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(PermissionController.class)
@AutoConfigureMockMvc(addFilters = false)
public class PermissionControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private PermissionService permissionService;

    @MockBean
    private UserService userService;

    @InjectMocks
    private PermissionController permissionController;

    @Autowired
    private ObjectMapper objectMapper;

    private Permission validPermission;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        validPermission = new Permission();
        validPermission.setName("Newname");
        validPermission.setApiPath("newAPI");
        validPermission.setMethod("newMethod");
        validPermission.setModule("newModule");
    }

    @Test
    void testCreatePermission_Success() throws Exception {
        PermissionRequestDTO requestDTO = new PermissionRequestDTO();
        requestDTO.setName("Newname");
        requestDTO.setApiPath("/api/new");
        requestDTO.setMethod("GET");
        requestDTO.setModule("Permission");

        Permission savedPermission = new Permission();
        savedPermission.setId(1L);
        savedPermission.setName("Newname");
        savedPermission.setApiPath("/api/new");
        savedPermission.setMethod("GET");
        savedPermission.setModule("Permission");

        when(permissionService.createPermission(any(PermissionRequestDTO.class)))
                .thenReturn(savedPermission);

        mockMvc.perform(post("/mpbhms/permissions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestDTO)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.name").value("Newname")); // ✅ đúng path
    }



    @Test
    void testCreatePermission_AlreadyExists() throws Exception {
        PermissionRequestDTO requestDTO = new PermissionRequestDTO();
        requestDTO.setName("Newname");
        requestDTO.setApiPath("/api/new");
        requestDTO.setMethod("GET");
        requestDTO.setModule("Permission");

        doThrow(new BusinessException("Permission already exists with the same module + path + method"))
                .when(permissionService).createPermission(any(PermissionRequestDTO.class));

        mockMvc.perform(post("/mpbhms/permissions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestDTO)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message")
                        .value("Permission already exists with the same module + path + method"));
    }


    @Test
    void testCreatePermission_MissingField() throws Exception {
        PermissionRequestDTO missingField = new PermissionRequestDTO();
        // Không set gì cả

        mockMvc.perform(post("/mpbhms/permissions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(missingField)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("ValidationError")); // Khớp chính xác
    }


    @Test
    void testUpdatePermission_Success() throws Exception {
        PermissionRequestDTO requestDTO = new PermissionRequestDTO();
        requestDTO.setId(1L);
        requestDTO.setName("Newname");
        requestDTO.setApiPath("/api/new");
        requestDTO.setMethod("GET");
        requestDTO.setModule("Permission");

        Permission updatedPermission = new Permission();
        updatedPermission.setId(1L);
        updatedPermission.setName("Newname");
        updatedPermission.setApiPath("/api/new");
        updatedPermission.setMethod("GET");
        updatedPermission.setModule("Permission");

        when(permissionService.updatePermission(any(PermissionRequestDTO.class)))
                .thenReturn(updatedPermission);

        mockMvc.perform(put("/mpbhms/permissions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestDTO)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.name").value("Newname")); // ✅ đúng path
    }


    @Test
    void testDeletePermission_Success() throws Exception {
        mockMvc.perform(delete("/mpbhms/permissions/1"))
                .andExpect(status().isOk());
    }


}