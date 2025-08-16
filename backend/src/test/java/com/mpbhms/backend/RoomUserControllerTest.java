package com.mpbhms.backend;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mpbhms.backend.controller.RoomUserController;
import com.mpbhms.backend.service.RoomUserService;
import com.mpbhms.backend.service.ContractService;
import com.mpbhms.backend.repository.UserRepository;
import com.mpbhms.backend.repository.RoomUserRepository;
import com.mpbhms.backend.service.AmendmentAutoApproveJob;
import com.mpbhms.backend.service.UserService;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(RoomUserController.class)
@AutoConfigureMockMvc(addFilters = false)
public class RoomUserControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean private RoomUserService roomUserService;
    @MockBean private ContractService contractService;
    @MockBean private UserRepository userRepository;
    @MockBean private RoomUserRepository roomUserRepository;
    @MockBean private AmendmentAutoApproveJob amendmentAutoApproveJob;

    @MockBean
    private UserService userService;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void testAddUsersToRoom() throws Exception {
        mockMvc.perform(post("/mpbhms/room-users/add-many")
                        .contentType("application/json")
                        .content("{}") // giả lập nội dung
                        .with(csrf()))
                .andExpect(status().isOk());
    }



    @Test
    void testProcessExpiredContracts() throws Exception {
        mockMvc.perform(post("/mpbhms/room-users/process-expired-contracts").with(csrf()))
                .andExpect(status().isOk());
    }

    @Test
    void testRenewContract() throws Exception {
        String body = objectMapper.writeValueAsString(Map.of("newEndDate", "2025-12-31T00:00:00Z", "reason", "extend"));
        Mockito.when(userRepository.findByUsername(any())).thenReturn(null); // không có userId
        mockMvc.perform(post("/mpbhms/room-users/renew-contract/1")
                        .contentType("application/json")
                        .content(body)
                        .with(csrf()))
                .andExpect(status().isOk());
    }

    @Test
    void testUpdateContract() throws Exception {
        mockMvc.perform(post("/mpbhms/room-users/update-contract")
                        .contentType("application/json")
                        .content("{}")
                        .with(csrf()))
                .andExpect(status().isOk());
    }

    @Test
    void testApproveAmendment() throws Exception {
        String body = objectMapper.writeValueAsString(Map.of("isLandlordApproval", true));
        mockMvc.perform(post("/mpbhms/room-users/approve-amendment/1")
                        .contentType("application/json")
                        .content(body)
                        .with(csrf()))
                .andExpect(status().isOk());
    }

    @Test
    void testRejectAmendment() throws Exception {
        String body = objectMapper.writeValueAsString(Map.of("reason", "Không đồng ý"));
        mockMvc.perform(post("/mpbhms/room-users/reject-amendment/1")
                        .contentType("application/json")
                        .content(body)
                        .with(csrf()))
                .andExpect(status().isOk());
    }

    @Test
    void testGetContractAmendments() throws Exception {
        mockMvc.perform(get("/mpbhms/room-users/contract-amendments/1"))
                .andExpect(status().isOk());
    }

    @Test
    void testTerminateContract() throws Exception {
        mockMvc.perform(post("/mpbhms/room-users/terminate-contract/1").with(csrf()))
                .andExpect(status().isOk());
    }

    @Test
    void testRequestTerminateContract() throws Exception {
        String body = objectMapper.writeValueAsString(Map.of("reason", "Chấm dứt hợp đồng"));
        mockMvc.perform(post("/mpbhms/room-users/request-terminate-contract/1")
                        .contentType("application/json")
                        .content(body)
                        .with(csrf()))
                .andExpect(status().isOk());
    }

    @Test
    void testGetMyRoom() throws Exception {
        mockMvc.perform(get("/mpbhms/room-users/my-room"))
                .andExpect(status().isOk());
    }

    @Test
    void testAutoApproveJobTrigger() throws Exception {
        mockMvc.perform(post("/mpbhms/room-users/test-auto-approve-amendments").with(csrf()))
                .andExpect(status().isOk());
    }
}
