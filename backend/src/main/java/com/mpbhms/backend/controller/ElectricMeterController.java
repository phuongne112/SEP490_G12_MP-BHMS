package com.mpbhms.backend.controller;

import com.mpbhms.backend.entity.ApiResponse;
import com.mpbhms.backend.entity.ScanLog;
import com.mpbhms.backend.service.ElectricMeterDetectionService;
import com.mpbhms.backend.service.ScanLogService;
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
    private final ScanLogService scanLogService;

    public ElectricMeterController(ElectricMeterDetectionService detectionService, ScanLogService scanLogService) {
        this.detectionService = detectionService;
        this.scanLogService = scanLogService;
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

    @PostMapping("/manual-scan")
    public ResponseEntity<ApiResponse<String>> manualScan(
            @RequestParam("file") MultipartFile file,
            @RequestParam("roomId") Long roomId
    ) throws IOException, InterruptedException {
        try {
            // Thực hiện OCR (không lưu ảnh)
            String result = detectionService.detectAndReadFromFile(file);
            
            // Lưu lịch sử quét (dù thành công hay thất bại)
            String fileName = file.getOriginalFilename();
            String errorMessage = null;
            
            // Luôn lưu kết quả OCR vào result, không phân biệt thành công hay thất bại
            try {
                scanLogService.saveLog(fileName, roomId, result, errorMessage);
            } catch (Exception logError) {
                // Log error silently
            }
            
            // Kiểm tra nếu scan thất bại thì return error
            if (result.startsWith("File không hợp lệ") || result.startsWith("Không tìm thấy")
                    || result.startsWith("Lỗi") || result.startsWith("Giá trị không hợp lệ")
                    || result.startsWith("OCR timeout") || result.startsWith("Invalid") || result.equals("Không quét được chỉ số điện")) {
                return ResponseEntity.badRequest().body(
                        new ApiResponse<>(400, "Yêu cầu không hợp lệ", "Có lỗi xảy ra khi xử lý ảnh", result));
            }
            
            return ResponseEntity.ok(new ApiResponse<>(200, null, "Quét thủ công thành công", result));
        } catch (Exception e) {
            // Lưu log lỗi hệ thống
            String fileName = file.getOriginalFilename();
            try {
                scanLogService.saveLog(fileName, roomId, "Lỗi hệ thống", e.getMessage());
            } catch (Exception logError) {
                // Log error silently
            }
            
            return ResponseEntity.badRequest().body(
                    new ApiResponse<>(400, "Lỗi xử lý", "Có lỗi xảy ra: " + e.getMessage(), null));
        }
    }

    @PostMapping("/detect-and-save")
    public ResponseEntity<ApiResponse<String>> detectAndSaveImage(
            @RequestParam("file") MultipartFile file,
            @RequestParam("roomId") Long roomId
    ) throws IOException, InterruptedException {
        try {
            String result = detectionService.detectReadAndSaveImage(file, roomId);

            if (result.startsWith("File không hợp lệ") || result.startsWith("Không tìm thấy")
                    || result.startsWith("Lỗi") || result.startsWith("Giá trị không hợp lệ")
                    || result.startsWith("OCR timeout") || result.startsWith("Invalid") || result.equals("Không quét được chỉ số điện")) {
                return ResponseEntity.badRequest().body(
                        new ApiResponse<>(400, "Yêu cầu không hợp lệ", "Có lỗi xảy ra khi xử lý ảnh", result));
            }

            return ResponseEntity.ok(new ApiResponse<>(200, null, "Đã chụp và lưu ảnh thành công", result));
        } catch (Exception e) {
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
            detectionService.saveImageToFileSystemOnly(file, roomId);
            
            return ResponseEntity.ok(new ApiResponse<>(200, null, "Đã chụp và lưu ảnh thành công", "Image saved"));
        } catch (Exception e) {
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