package com.mpbhms.backend.controller;

import com.mpbhms.backend.dto.AssetInventoryRequest;
import com.mpbhms.backend.service.AssetInventoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/mpbhms/asset-inventory")
@RequiredArgsConstructor
public class AssetInventoryController {
    private final AssetInventoryService assetInventoryService;

    @PostMapping("/checkin")
    public ResponseEntity<?> checkinAssets(@RequestBody List<AssetInventoryRequest> requestList) {
        assetInventoryService.saveCheckinAssets(requestList);
        return ResponseEntity.ok("Đã lưu kiểm kê tài sản thành công!");
    }
} 