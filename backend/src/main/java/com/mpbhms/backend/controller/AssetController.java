package com.mpbhms.backend.controller;

import com.mpbhms.backend.dto.AssetDTO;
import com.mpbhms.backend.service.AssetService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import com.mpbhms.backend.dto.ResultPaginationDTO;
import org.springframework.data.domain.PageRequest;
import java.util.Map;

@RestController
@RequestMapping("/mpbhms/assets")
@RequiredArgsConstructor
public class AssetController {
    private final AssetService assetService;

    @GetMapping
    public ResponseEntity<ResultPaginationDTO> getAllAssets(
            @RequestParam(required = false) String assetName,
            @RequestParam(required = false) String assetStatus,
            @RequestParam(required = false) Integer minQuantity,
            @RequestParam(required = false) Integer maxQuantity,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        return ResponseEntity.ok(assetService.searchAssets(assetName, assetStatus, minQuantity, maxQuantity, PageRequest.of(page, size)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<AssetDTO> getAssetById(@PathVariable Long id) {
        return ResponseEntity.ok(assetService.getAssetById(id));
    }

    @PostMapping
    public ResponseEntity<AssetDTO> createAsset(
        @RequestParam String assetName,
        @RequestParam java.math.BigDecimal quantity,
        @RequestParam(required = false) String conditionNote,
        @RequestParam(value = "assetImage", required = false) MultipartFile assetImage
    ) {
        AssetDTO assetDTO = new AssetDTO();
        assetDTO.setAssetName(assetName);
        assetDTO.setQuantity(quantity);
        assetDTO.setConditionNote(conditionNote);
        if (assetImage != null && !assetImage.isEmpty()) {
            String fileName = System.currentTimeMillis() + "_" + assetImage.getOriginalFilename();
            String uploadDir = System.getProperty("user.dir") + "/uploads/";
            java.io.File uploadPath = new java.io.File(uploadDir);
            if (!uploadPath.exists()) uploadPath.mkdirs();
            try {
                assetImage.transferTo(new java.io.File(uploadDir + fileName));
                assetDTO.setAssetImage("/uploads/" + fileName);
            } catch (Exception e) {
                throw new RuntimeException("Lỗi khi lưu file ảnh: " + e.getMessage());
            }
        }
        return ResponseEntity.ok(assetService.createAsset(assetDTO));
    }

    @PutMapping("/{id}")
    public ResponseEntity<AssetDTO> updateAsset(
        @PathVariable Long id,
        @RequestParam String assetName,
        @RequestParam java.math.BigDecimal quantity,
        @RequestParam(required = false) String conditionNote,
        @RequestParam(value = "assetImage", required = false) MultipartFile assetImage
    ) {
        AssetDTO assetDTO = new AssetDTO();
        assetDTO.setAssetName(assetName);
        assetDTO.setQuantity(quantity);
        assetDTO.setConditionNote(conditionNote);
        if (assetImage != null && !assetImage.isEmpty()) {
            String fileName = System.currentTimeMillis() + "_" + assetImage.getOriginalFilename();
            String uploadDir = System.getProperty("user.dir") + "/uploads/";
            java.io.File uploadPath = new java.io.File(uploadDir);
            if (!uploadPath.exists()) uploadPath.mkdirs();
            try {
                assetImage.transferTo(new java.io.File(uploadDir + fileName));
                assetDTO.setAssetImage("/uploads/" + fileName);
            } catch (Exception e) {
                throw new RuntimeException("Lỗi khi lưu file ảnh: " + e.getMessage());
            }
        }
        return ResponseEntity.ok(assetService.updateAsset(id, assetDTO));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteAsset(@PathVariable Long id) {
        assetService.deleteAsset(id);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{assetId}/assign-room")
    public ResponseEntity<AssetDTO> assignAssetToRoom(@PathVariable Long assetId, @RequestBody Map<String, Long> request) {
        Long roomId = request.get("roomId");
        return ResponseEntity.ok(assetService.assignAssetToRoom(assetId, roomId));
    }

    @GetMapping("/check-duplicate")
    public ResponseEntity<Map<String, Boolean>> checkDuplicateAssetName(
            @RequestParam String assetName,
            @RequestParam(required = false) Long excludeId) {
        boolean isDuplicate = assetService.isAssetNameDuplicate(assetName, excludeId);
        return ResponseEntity.ok(Map.of("isDuplicate", isDuplicate));
    }

    @GetMapping("/{id}/in-use")
    public ResponseEntity<Map<String, Boolean>> checkAssetInUse(@PathVariable Long id) {
        boolean isInUse = assetService.isAssetInUse(id);
        return ResponseEntity.ok(Map.of("isInUse", isInUse));
    }
} 