package com.mpbhms.backend.controller;

import com.mpbhms.backend.entity.ScanLog;
import com.mpbhms.backend.entity.ServiceReading;
import com.mpbhms.backend.entity.Room;
import com.mpbhms.backend.entity.CustomService;
import com.mpbhms.backend.enums.ServiceType;
import com.mpbhms.backend.service.AutoElectricMeterScanner;
import com.mpbhms.backend.service.ScanLogService;
import com.mpbhms.backend.service.OcrCccdService;
import com.mpbhms.backend.repository.RoomRepository;
import com.mpbhms.backend.repository.ServiceReadingRepository;
import com.mpbhms.backend.repository.ServiceRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.File;
import java.util.List;
import java.util.Arrays;
import java.util.Map;
import java.util.HashMap;

@RestController
@RequestMapping("/mpbhms/ocr")
public class OcrControlController {
    private final AutoElectricMeterScanner scanner;
    private final ScanLogService scanLogService;
    private final OcrCccdService ocrCccdService;
    private final RoomRepository roomRepository;
    private final ServiceReadingRepository serviceReadingRepository;
    private final ServiceRepository serviceRepository;

    public OcrControlController(AutoElectricMeterScanner scanner, ScanLogService scanLogService, OcrCccdService ocrCccdService,
                               RoomRepository roomRepository, ServiceReadingRepository serviceReadingRepository, ServiceRepository serviceRepository) {
        this.scanner = scanner;
        this.scanLogService = scanLogService;
        this.ocrCccdService = ocrCccdService;
        this.roomRepository = roomRepository;
        this.serviceReadingRepository = serviceReadingRepository;
        this.serviceRepository = serviceRepository;
    }

    @PostMapping("/auto-scan/on")
    public ResponseEntity<String> enableAutoScan() {
        scanner.setEnabled(true);
        return ResponseEntity.ok("Auto scan ENABLED");
    }

    @PostMapping("/auto-scan/off")
    public ResponseEntity<String> disableAutoScan() {
        scanner.setEnabled(false);
        return ResponseEntity.ok("Auto scan DISABLED");
    }

    @GetMapping("/auto-scan/status")
    public ResponseEntity<String> getStatus() {
        return ResponseEntity.ok(scanner.isEnabled() ? "Auto scan ON" : "Auto scan OFF");
    }

    @GetMapping("/auto-scan/interval")
    public Map<String, Long> getScanInterval() {
        return Map.of("intervalMs", scanner.getInterval());
    }

    @PostMapping("/auto-scan/interval")
    public ResponseEntity<String> setScanInterval(@RequestBody Map<String, Long> request) {
        Long intervalMs = request.get("intervalMs");
        if (intervalMs != null && intervalMs > 0) {
            scanner.setInterval(intervalMs);
            return ResponseEntity.ok("Scan interval updated to " + intervalMs + "ms");
        }
        return ResponseEntity.badRequest().body("Invalid interval");
    }



    @GetMapping("/scan-logs")
    public ResponseEntity<Page<ScanLog>> getScanLogs(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) Long roomId) {
        PageRequest pageRequest = PageRequest.of(page, size, Sort.by("scanTime").descending());
        Page<ScanLog> logs;
        if (roomId != null) {
            logs = scanLogService.getScanLogsByRoomId(roomId, pageRequest);
        } else {
            logs = scanLogService.getScanLogs(pageRequest);
        }
        return ResponseEntity.ok(logs);
    }

    @GetMapping("/scan-images")
    public ResponseEntity<List<String>> getScanImages() {
        try {
            File scanFolder = new File(scanner.getScanFolder());
            if (!scanFolder.exists() || !scanFolder.isDirectory()) {
                return ResponseEntity.ok(Arrays.asList());
            }

            File[] roomFolders = scanFolder.listFiles(File::isDirectory);
            if (roomFolders == null) {
                return ResponseEntity.ok(Arrays.asList());
            }

            List<String> images = new java.util.ArrayList<>();
            for (File roomFolder : roomFolders) {
                File[] files = roomFolder.listFiles(file -> 
                    file.isFile() && file.getName().matches(".*\\.(jpg|png|jpeg)$") && 
                    !file.getName().startsWith("processed_")
                );
                if (files != null) {
                    for (File file : files) {
                        images.add(roomFolder.getName() + "/" + file.getName());
                    }
                }
            }
            return ResponseEntity.ok(images);
        } catch (Exception e) {
            return ResponseEntity.ok(Arrays.asList());
        }
    }

    @GetMapping("/current-scanning")
    public ResponseEntity<Map<String, String>> getCurrentScanning() {
        String currentFile = scanner.getCurrentScanningFile();
        return ResponseEntity.ok(Map.of("current", currentFile != null ? currentFile : ""));
    }

    @PostMapping("/cccd")
    public ResponseEntity<?> ocrCccd(@RequestParam("front") org.springframework.web.multipart.MultipartFile frontImage,
                                     @RequestParam("back") org.springframework.web.multipart.MultipartFile backImage) {
        try {
            Map<String, Object> result = ocrCccdService.ocrCccd(frontImage, backImage);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/manual-electric-reading")
    public ResponseEntity<?> manualElectricReading(
            @RequestParam("roomId") Long roomId,
            @RequestParam("newReading") java.math.BigDecimal newReading,
            @RequestParam(value = "image", required = false) org.springframework.web.multipart.MultipartFile image) {
        try {
            // Tìm phòng
            Room room = roomRepository.findById(roomId)
                    .orElseThrow(() -> new RuntimeException("Room not found with id: " + roomId));

            // Tìm dịch vụ điện
            CustomService electricityService = serviceRepository.findByServiceType(ServiceType.ELECTRICITY);
            if (electricityService == null) {
                return ResponseEntity.badRequest().body("Electricity service not found");
            }

            // Tìm service reading hiện tại
            java.util.List<ServiceReading> existingReadings = serviceReadingRepository.findByRoomAndService(room, electricityService);
            ServiceReading currentReading;
            
            if (existingReadings.isEmpty()) {
                // Tạo mới nếu chưa có
                currentReading = new ServiceReading();
                currentReading.setRoom(room);
                currentReading.setService(electricityService);
                currentReading.setOldReading(new java.math.BigDecimal("0.000"));
            } else {
                // Lấy reading mới nhất
                currentReading = existingReadings.get(existingReadings.size() - 1);
            }

            // Lưu ảnh nếu có
            String imagePath = null;
            if (image != null && !image.isEmpty()) {
                String fileName = System.currentTimeMillis() + "_" + image.getOriginalFilename();
                // Dùng chung thư mục scan của hệ thống (đã cấu hình cho AutoElectricMeterScanner)
                String baseScanDir = scanner.getScanFolder();
                String uploadDir = (baseScanDir.endsWith("/") ? baseScanDir : baseScanDir + "/") + room.getScanFolder() + "/";
                java.io.File uploadPath = new java.io.File(uploadDir);
                if (!uploadPath.exists()) uploadPath.mkdirs();
                
                image.transferTo(new java.io.File(uploadDir + fileName));
                imagePath = "/img/ocr/" + room.getScanFolder() + "/" + fileName;
            }

            // Tạo service reading mới
            ServiceReading newServiceReading = new ServiceReading();
            newServiceReading.setRoom(room);
            newServiceReading.setService(electricityService);
            newServiceReading.setOldReading(currentReading.getNewReading());
            newServiceReading.setNewReading(newReading);

            // Lưu service reading
            serviceReadingRepository.save(newServiceReading);

            // Tạo scan log
            String fileName = imagePath != null ? imagePath : "manual_reading_" + System.currentTimeMillis();
            String logResult = "Manual electric reading: " + newReading + " kWh for room " + room.getRoomNumber();
            ScanLog scanLog = scanLogService.saveLog(fileName, roomId, logResult, null);

            // Tính toán tiêu thụ
            java.math.BigDecimal consumption = newReading.subtract(currentReading.getNewReading());
            java.math.BigDecimal cost = consumption.multiply(electricityService.getUnitPrice());

            Map<String, Object> result = new HashMap<>();
            result.put("success", true);
            result.put("roomNumber", room.getRoomNumber());
            result.put("oldReading", currentReading.getNewReading());
            result.put("newReading", newReading);
            result.put("consumption", consumption);
            result.put("unitPrice", electricityService.getUnitPrice());
            result.put("cost", cost);
            result.put("imagePath", imagePath);
            result.put("scanLogId", scanLog.getId());

            return ResponseEntity.ok(result);

        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error processing manual reading: " + e.getMessage());
        }
    }

    @GetMapping("/electric-readings/{roomId}")
    public ResponseEntity<?> getElectricReadings(@PathVariable Long roomId) {
        try {
            Room room = roomRepository.findById(roomId)
                    .orElseThrow(() -> new RuntimeException("Room not found with id: " + roomId));

            CustomService electricityService = serviceRepository.findByServiceType(ServiceType.ELECTRICITY);
            if (electricityService == null) {
                return ResponseEntity.badRequest().body("Electricity service not found");
            }

            java.util.List<ServiceReading> readings = serviceReadingRepository.findByRoomAndService(room, electricityService);
            
            Map<String, Object> result = new HashMap<>();
            result.put("roomNumber", room.getRoomNumber());
            result.put("readings", readings);
            result.put("totalReadings", readings.size());

            return ResponseEntity.ok(result);

        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error getting readings: " + e.getMessage());
        }
    }
} 