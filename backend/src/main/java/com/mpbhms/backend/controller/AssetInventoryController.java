package com.mpbhms.backend.controller;

import com.mpbhms.backend.dto.AssetInventoryRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.multipart.MultipartFile;
import com.mpbhms.backend.service.AssetInventoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;
import com.mpbhms.backend.entity.AssetInventory;

@RestController
@RequestMapping("/mpbhms/asset-inventory")
@RequiredArgsConstructor
public class AssetInventoryController {
    private final AssetInventoryService assetInventoryService;

    @Value("${file.upload-dir:${user.dir}/uploads}")
    private String uploadDir;

    @PostMapping("/checkin")
    public ResponseEntity<?> checkinAssets(@RequestBody List<AssetInventoryRequest> requestList) {
        assetInventoryService.saveCheckinAssets(requestList);
        return ResponseEntity.ok("Đã lưu kiểm kê tài sản thành công!");
    }

    @GetMapping("/by-room")
    public ResponseEntity<List<AssetInventory>> getAssetsByRoom(@RequestParam String roomNumber) {
        return ResponseEntity.ok(assetInventoryService.getAssetsByRoomNumber(roomNumber));
    }

    @GetMapping("/by-room-contract")
    public ResponseEntity<List<Map<String, Object>>> getAssetsByRoomAndContract(@RequestParam String roomNumber, @RequestParam Long contractId) {
        return ResponseEntity.ok(assetInventoryService.getAssetInventoryWithAssetNameByRoomAndContract(roomNumber, contractId));
    }

    // Upload ảnh minh chứng, trả về URL public
    @PostMapping("/upload-photo")
    public ResponseEntity<String> uploadInventoryPhoto(@RequestParam("image") MultipartFile image) {
        try {
            if (image == null || image.isEmpty()) {
                return ResponseEntity.badRequest().body("Image is empty");
            }
            String fileName = System.currentTimeMillis() + "_" + image.getOriginalFilename();
            String resolvedUploadDir = (uploadDir != null && uploadDir.endsWith("/")) ? uploadDir : (uploadDir + "/");
            java.io.File uploadPath = new java.io.File(resolvedUploadDir);
            if (!uploadPath.exists()) uploadPath.mkdirs();
            image.transferTo(new java.io.File(resolvedUploadDir + fileName));
            return ResponseEntity.ok("/uploads/" + fileName);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Upload error: " + e.getMessage());
        }
    }
} 