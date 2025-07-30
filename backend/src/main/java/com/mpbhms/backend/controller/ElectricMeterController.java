package com.mpbhms.backend.controller;

import com.mpbhms.backend.entity.ApiResponse;
import com.mpbhms.backend.service.ElectricMeterDetectionService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

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

    @PostMapping("/detect-and-save")
    public ResponseEntity<ApiResponse<String>> detectAndSaveImage(
            @RequestParam("file") MultipartFile file,
            @RequestParam("roomId") Long roomId
    ) throws IOException, InterruptedException {
        try {
            System.out.println("Received request - roomId: " + roomId + ", file: " + file.getOriginalFilename());
            
            String result = detectionService.detectReadAndSaveImage(file, roomId);

            if (result.startsWith("File không hợp lệ") || result.startsWith("Không tìm thấy")
                    || result.startsWith("Lỗi") || result.startsWith("Giá trị không hợp lệ")
                    || result.startsWith("OCR timeout") || result.startsWith("Invalid") || result.equals("Không quét được chỉ số điện")) {
                System.out.println("OCR failed with result: " + result);
                return ResponseEntity.badRequest().body(
                        new ApiResponse<>(400, "Yêu cầu không hợp lệ", "Có lỗi xảy ra khi xử lý ảnh", result));
            }

            System.out.println("OCR successful with result: " + result);
            return ResponseEntity.ok(new ApiResponse<>(200, null, "Đã chụp và lưu ảnh thành công", result));
        } catch (Exception e) {
            System.err.println("Error in detectAndSaveImage: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.badRequest().body(
                    new ApiResponse<>(400, "Lỗi xử lý", "Có lỗi xảy ra: " + e.getMessage(), null));
        }
    }

    @PostMapping("/save-image-only")
    public ResponseEntity<ApiResponse<String>> saveImageOnly(
            @RequestParam("file") MultipartFile file,
            @RequestParam("roomId") Long roomId
    ) throws IOException {
        try {
            System.out.println("Received save-image-only request - roomId: " + roomId + ", file: " + file.getOriginalFilename());
            
            detectionService.saveImageToFileSystemOnly(file, roomId);
            
            System.out.println("Image saved successfully without OCR");
            return ResponseEntity.ok(new ApiResponse<>(200, null, "Đã chụp và lưu ảnh thành công", "Image saved"));
        } catch (Exception e) {
            System.err.println("Error in saveImageOnly: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.badRequest().body(
                    new ApiResponse<>(400, "Lỗi xử lý", "Có lỗi xảy ra: " + e.getMessage(), null));
        }
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