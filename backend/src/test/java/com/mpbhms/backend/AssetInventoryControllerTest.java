
package com.mpbhms.backend;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mpbhms.backend.controller.AssetInventoryController;
import com.mpbhms.backend.dto.AssetInventoryRequest;
import com.mpbhms.backend.entity.AssetInventory;
import com.mpbhms.backend.service.AssetInventoryService;
import com.mpbhms.backend.service.UserService;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.FilterType;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = AssetInventoryController.class,
        excludeAutoConfiguration = {
                org.springframework.boot.autoconfigure.security.servlet.SecurityAutoConfiguration.class
        },
        excludeFilters = @ComponentScan.Filter(
                type = FilterType.ASSIGNABLE_TYPE,
                classes = com.mpbhms.backend.config.PermissionInterceptor.class
        )
)
public class AssetInventoryControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private AssetInventoryService assetInventoryService;

    @MockBean
    private UserService userService;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    public void testCheckinAssets() throws Exception {
        AssetInventoryRequest request = new AssetInventoryRequest();
        request.setAssetId(1L);
        request.setRoomNumber("Phòng A101");
        request.setStatus("GOOD");
        request.setNote("Ghi chú 1");
        request.setIsEnough(true);
        request.setType("CHECKIN");

        List<AssetInventoryRequest> requests = List.of(request);

        mockMvc.perform(MockMvcRequestBuilders.post("/mpbhms/asset-inventory/checkin")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requests)))
                .andExpect(status().isOk())
                .andExpect(content().string("Đã lưu kiểm kê tài sản thành công!"));
    }

    @Test
    public void testGetAssetsByRoom() throws Exception {
        AssetInventory asset = new AssetInventory();
        asset.setId(1L);
        asset.setRoomNumber("A101");

        Mockito.when(assetInventoryService.getAssetsByRoomNumber("A101"))
                .thenReturn(List.of(asset));

        mockMvc.perform(MockMvcRequestBuilders.get("/mpbhms/asset-inventory/by-room")
                        .param("roomNumber", "A101"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].roomNumber").value("A101"));
    }

    @Test
    public void testGetAssetsByRoomAndContract() throws Exception {
        AssetInventory asset = new AssetInventory();
        asset.setId(2L);
        asset.setRoomNumber("B201");

        Mockito.when(assetInventoryService.getAssetsByRoomNumberAndContractId("B201", 10L))
                .thenReturn(List.of(asset));

        mockMvc.perform(MockMvcRequestBuilders.get("/mpbhms/asset-inventory/by-room-contract")
                        .param("roomNumber", "B201")
                        .param("contractId", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].roomNumber").value("B201"));
    }
}
