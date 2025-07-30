
package com.mpbhms.backend;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mpbhms.backend.controller.AssetController;
import com.mpbhms.backend.dto.AssetDTO;
import com.mpbhms.backend.dto.ResultPaginationDTO;
import com.mpbhms.backend.service.AssetService;
import com.mpbhms.backend.service.UserService;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.test.web.servlet.result.MockMvcResultMatchers;

import java.math.BigDecimal;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = AssetController.class,
        excludeAutoConfiguration = {
                org.springframework.boot.autoconfigure.security.servlet.SecurityAutoConfiguration.class
        })
public class AssetControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private AssetService assetService;

    @MockBean
    private UserService userService;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    public void testGetAllAssets() throws Exception {
        Mockito.when(assetService.searchAssets(any(), any(), any(), any(), any()))
                .thenReturn(new ResultPaginationDTO());

        mockMvc.perform(MockMvcRequestBuilders.get("/mpbhms/assets"))
                .andExpect(status().isOk());
    }

    @Test
    public void testGetAssetById() throws Exception {
        AssetDTO asset = new AssetDTO();
        asset.setAssetName("Test Asset");
        Mockito.when(assetService.getAssetById(1L)).thenReturn(asset);

        mockMvc.perform(MockMvcRequestBuilders.get("/mpbhms/assets/1"))
                .andExpect(status().isOk())
                .andExpect(MockMvcResultMatchers.jsonPath("$.data.assetName").value("Test Asset"));
    }

    @Test
    public void testCreateAsset() throws Exception {
        MockMultipartFile image = new MockMultipartFile("assetImage", "image.png", "image/png", "fake-image-content".getBytes());
        AssetDTO createdAsset = new AssetDTO();
        createdAsset.setAssetName("Created Asset");
        createdAsset.setQuantity(BigDecimal.valueOf(5));
        Mockito.when(assetService.createAsset(any())).thenReturn(createdAsset);

        mockMvc.perform(MockMvcRequestBuilders.multipart("/mpbhms/assets")
                        .file(image)
                        .param("assetName", "Created Asset")
                        .param("quantity", "5"))
                .andExpect(status().isOk())
                .andExpect(MockMvcResultMatchers.jsonPath("$.data.assetName").value("Created Asset"));
    }

    @Test
    public void testUpdateAsset() throws Exception {
        MockMultipartFile image = new MockMultipartFile("assetImage", "image.png", "image/png", "fake-image-content".getBytes());
        AssetDTO updatedAsset = new AssetDTO();
        updatedAsset.setAssetName("Updated Asset");
        updatedAsset.setQuantity(BigDecimal.valueOf(10));
        Mockito.when(assetService.updateAsset(eq(1L), any())).thenReturn(updatedAsset);

        mockMvc.perform(MockMvcRequestBuilders.multipart("/mpbhms/assets/1")
                        .file(image)
                        .with(request -> { request.setMethod("PUT"); return request; })
                        .param("assetName", "Updated Asset")
                        .param("quantity", "10"))
                .andExpect(status().isOk())
                .andExpect(MockMvcResultMatchers.jsonPath("$.data.assetName").value("Updated Asset"));
    }

    @Test
    public void testDeleteAsset() throws Exception {
        mockMvc.perform(MockMvcRequestBuilders.delete("/mpbhms/assets/1"))
                .andExpect(status().isOk());
    }

    @Test
    public void testAssignAssetToRoom() throws Exception {
        AssetDTO assetDTO = new AssetDTO();
        assetDTO.setAssetName("Assigned Asset");
        Mockito.when(assetService.assignAssetToRoom(eq(1L), eq(2L))).thenReturn(assetDTO);

        mockMvc.perform(MockMvcRequestBuilders.post("/mpbhms/assets/1/assign-room")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("roomId", 2L))))
                .andExpect(status().isOk())
                .andExpect(MockMvcResultMatchers.jsonPath("$.data.assetName").value("Assigned Asset"));
    }
}
