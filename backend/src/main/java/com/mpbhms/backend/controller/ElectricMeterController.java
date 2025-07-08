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
                || result.startsWith("OCR timeout") || result.startsWith("Invalid") || result.equals("Không quét được chỉ số điện")) {
            return ResponseEntity.badRequest().body(
                    new ApiResponse<>(400, "Yêu cầu không hợp lệ", "Có lỗi xảy ra khi xử lý ảnh", result));
        }

        return ResponseEntity.ok(new ApiResponse<>(200, null, "Thành công", result));
    }

    @PostMapping("/save-reading")
    public ResponseEntity<ApiResponse<String>> saveReading(
            @RequestParam("roomId") Long roomId,
            @RequestParam("value") String value
    ) {
        detectionService.saveElectricReading(value, roomId);
        return ResponseEntity.ok(new ApiResponse<>(200, null, "Lưu thành công", value));
    }
}