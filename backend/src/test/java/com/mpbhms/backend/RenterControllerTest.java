package com.mpbhms.backend;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mpbhms.backend.controller.RenterController;
import com.mpbhms.backend.dto.*;
import com.mpbhms.backend.entity.User;
import com.mpbhms.backend.service.RenterService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.core.MethodParameter;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.ModelAndViewContainer;
import org.springframework.data.web.PageableHandlerMethodArgumentResolver;

import java.util.Collections;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
public class RenterControllerTest {
    private MockMvc mockMvc;
    @Mock
    private RenterService renterService;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        RenterController controller = new RenterController(renterService);

        // Custom resolver cho Specification
        HandlerMethodArgumentResolver mockFilterResolver = new HandlerMethodArgumentResolver() {
            @Override
            public boolean supportsParameter(MethodParameter parameter) {
                return Specification.class.isAssignableFrom(parameter.getParameterType());
            }

            @Override
            public Object resolveArgument(MethodParameter parameter, ModelAndViewContainer mavContainer,
                    NativeWebRequest webRequest,
                    org.springframework.web.bind.support.WebDataBinderFactory binderFactory) {
                return (Specification<User>) (root, query, cb) -> cb.conjunction();
            }
        };

        // Thêm resolver cho Pageable
        PageableHandlerMethodArgumentResolver pageableResolver = new PageableHandlerMethodArgumentResolver();

        mockMvc = MockMvcBuilders
                .standaloneSetup(controller)
                .setCustomArgumentResolvers(mockFilterResolver, pageableResolver)
                .build();
    }

    @Test
    public void testGetAllRenters_Success() throws Exception {
        ResultPaginationDTO mockResult = new ResultPaginationDTO();
        mockResult.setResult(Collections.emptyList());
        when(renterService.getAllRenters(any(), any(Pageable.class), any(), any(), any()))
                .thenReturn(mockResult);

        mockMvc.perform(get("/mpbhms/renters")
                .param("page", "0")
                .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result").exists());
    }

    @Test
    public void testCreateRenter_Success() throws Exception {
        CreateUserRequest request = new CreateUserRequest();
        request.setUsername("testuser");
        request.setPassword("Test@1234");
        request.setEmail("testuser@gmail.com");
        request.setPhone("0912345678");

        CreateUserResponse response = new CreateUserResponse();
        response.setUsername("testuser");
        when(renterService.createRenter(any(CreateUserRequest.class))).thenReturn(response);

        mockMvc.perform(post("/mpbhms/renters")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.username").value("testuser"));
    }

    @Test
    public void testUpdateRenterStatus_Success() throws Exception {
        UpdateUserStatusRequest request = new UpdateUserStatusRequest();
        request.setActive(true);
        doNothing().when(renterService).updateRenterStatus(eq(1L), eq(true));

        mockMvc.perform(put("/mpbhms/renters/{id}/status", 1L)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNoContent());
    }

    @Test
    public void testGetRentersForAssign_Success() throws Exception {
        UserDTO userDTO = new UserDTO();
        userDTO.setId(1L);
        when(renterService.getRentersForAssign(any())).thenReturn(Collections.singletonList(userDTO));

        mockMvc.perform(get("/mpbhms/renters/for-assign")
                .param("keyword", "test"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(1L));
    }

    @Test
    public void testGetAllRentersForAssignFull_Success() throws Exception {
        UserDTO userDTO = new UserDTO();
        userDTO.setId(2L);
        when(renterService.getAllRentersWithInfo()).thenReturn(Collections.singletonList(userDTO));

        mockMvc.perform(get("/mpbhms/renters/for-assign-full"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(2L));
    }
}