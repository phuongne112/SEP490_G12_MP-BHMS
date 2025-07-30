package com.mpbhms.backend;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mpbhms.backend.controller.RoomAssetController;
import com.mpbhms.backend.dto.RoomAssetDTO;
import com.mpbhms.backend.repository.RoomRepository;
import com.mpbhms.backend.repository.AssetRepository;
import com.mpbhms.backend.service.RoomAssetService;
import com.mpbhms.backend.service.UserService;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(RoomAssetController.class)
public class RoomAssetControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private RoomAssetService roomAssetService;

    @MockBean
    private RoomRepository roomRepository;

    @MockBean
    private AssetRepository assetRepository;

    @MockBean
    private UserService userService; // ✅ cần thiết vì PermissionInterceptor có @Autowired

    @Test
    void testAddAssetToRoom() throws Exception {
        RoomAssetDTO mockDto = new RoomAssetDTO();
        mockDto.setAssetId(1L);
        mockDto.setRoomId(1L);
        mockDto.setQuantity(5);
        mockDto.setStatus("OK");

        Mockito.when(roomAssetService.addAssetToRoom(any(), any(), any(), any(), any()))
                .thenReturn(mockDto);

        mockMvc.perform(post("/mpbhms/room-assets")
                        .param("roomId", "1")
                        .param("assetId", "1")
                        .param("quantity", "5")
                        .param("status", "OK")
                        .param("note", "test note")
                        .with(csrf())
                        .with(user("admin").roles("ADMIN"))) // ✅ thêm xác thực
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.roomId").value(1L));
    }

    @Test
    void testUpdateRoomAsset() throws Exception {
        RoomAssetDTO mockDto = new RoomAssetDTO();
        mockDto.setId(1L);
        mockDto.setQuantity(10);
        mockDto.setStatus("UPDATED");

        Mockito.when(roomAssetService.updateRoomAsset(eq(1L), eq(10), eq("UPDATED"), eq("Updated note")))
                .thenReturn(mockDto);

        mockMvc.perform(put("/mpbhms/room-assets/1")
                        .param("quantity", "10")
                        .param("status", "UPDATED")
                        .param("note", "Updated note")
                        .with(csrf())
                        .with(user("admin").roles("ADMIN"))) // ✅ thêm xác thực
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(1L))
                .andExpect(jsonPath("$.data.quantity").value(10));
    }

    @Test
    void testDeleteRoomAsset() throws Exception {
        mockMvc.perform(delete("/mpbhms/room-assets/1")
                        .with(csrf())
                        .with(user("admin").roles("ADMIN"))) // ✅ thêm xác thực
                .andExpect(status().isOk());
    }
}
