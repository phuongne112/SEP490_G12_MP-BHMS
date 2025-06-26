package com.mpbhms.backend.controller;

import com.mpbhms.backend.dto.AssetDTO;
import com.mpbhms.backend.service.AssetService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/mpbhms/assets")
@RequiredArgsConstructor
public class AssetController {
    private static final Logger logger = LoggerFactory.getLogger(AssetController.class);
    private final AssetService assetService;

    @GetMapping
    public ResponseEntity<List<AssetDTO>> getAllAssets(@RequestParam(required = false) String assetName) {
        logger.info("[AssetController] GET /assets - assetName param: {}", assetName);
        if (assetName != null && !assetName.isEmpty()) {
            List<AssetDTO> result = assetService.findByAssetName(assetName);
            logger.info("[AssetController] Search result count: {}", result.size());
            return ResponseEntity.ok(result);
        }
        List<AssetDTO> all = assetService.getAllAssets();
        logger.info("[AssetController] All assets count: {}", all.size());
        return ResponseEntity.ok(all);
    }

    @GetMapping("/{id}")
    public ResponseEntity<AssetDTO> getAssetById(@PathVariable Long id) {
        return ResponseEntity.ok(assetService.getAssetById(id));
    }

    @PostMapping
    public ResponseEntity<AssetDTO> createAsset(
        @ModelAttribute AssetDTO assetDTO,
        @RequestParam(value = "assetImage", required = false) MultipartFile assetImage
    ) {
        System.out.println("==> assetName: " + assetDTO.getAssetName());
        System.out.println("==> quantity: " + assetDTO.getQuantity());
        System.out.println("==> assetStatus: " + assetDTO.getAssetStatus());
        System.out.println("==> conditionNote: " + assetDTO.getConditionNote());
        System.out.println("==> assetImage: " + (assetImage != null ? assetImage.getOriginalFilename() : "null"));
        if (assetImage != null && !assetImage.isEmpty()) {
            String fileName = System.currentTimeMillis() + "_" + assetImage.getOriginalFilename();
            String uploadDir = "uploads/";
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
    public ResponseEntity<AssetDTO> updateAsset(@PathVariable Long id, @RequestBody AssetDTO assetDTO) {
        return ResponseEntity.ok(assetService.updateAsset(id, assetDTO));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteAsset(@PathVariable Long id) {
        assetService.deleteAsset(id);
        return ResponseEntity.ok().build();
    }
} 