package com.mpbhms.backend.controller;

import com.mpbhms.backend.entity.ApiResponse;
import com.mpbhms.backend.service.ElectricMeterDetectionService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

@RestController
@RequestMapping("/mpbhms/ocr")
public class ElectricMeterController {

    private final ElectricMeterDetectionService detectionService;

    public ElectricMeterController(ElectricMeterDetectionService detectionService) {
        this.detectionService = detectionService;
    }

    @PostMapping("/detect-ocr")
    public ResponseEntity<ApiResponse<String>> detectAndRead(
            @RequestParam("file") MultipartFile file
    ) throws IOException, InterruptedException {
        String result = detectionService.detectAndReadFromFile(file);

        if (result.startsWith("File không hợp lệ") || result.startsWith("Không tìm thấy")
                || result.startsWith("Lỗi") || result.startsWith("Giá trị không hợp lệ")
                || result.startsWith("OCR timeout")) {
            return ResponseEntity.badRequest().body(
                    new ApiResponse<>(400, "Bad Request", "An error occurred while processing the image", result));
        }

        return ResponseEntity.ok(new ApiResponse<>(200, null, "Success", result));
    }

    @PostMapping("/save-reading")
    public ResponseEntity<ApiResponse<String>> saveReading(
            @RequestParam("roomId") Long roomId,
            @RequestParam("value") String value
    ) {
        detectionService.saveElectricReading(value, roomId);
        return ResponseEntity.ok(new ApiResponse<>(200, null, "Saved successfully", value));
    }
}