package com.mpbhms.backend.controller;

import com.mpbhms.backend.entity.ScanLog;
import com.mpbhms.backend.service.AutoElectricMeterScanner;
import com.mpbhms.backend.service.ScanLogService;
import com.mpbhms.backend.service.OcrCccdService;
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

    public OcrControlController(AutoElectricMeterScanner scanner, ScanLogService scanLogService, OcrCccdService ocrCccdService) {
        this.scanner = scanner;
        this.scanLogService = scanLogService;
        this.ocrCccdService = ocrCccdService;
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

    // Auto Capture endpoints
    @PostMapping("/auto-capture/on")
    public ResponseEntity<String> enableAutoCapture() {
        scanner.setAutoCaptureEnabled(true);
        return ResponseEntity.ok("Auto capture ENABLED");
    }

    @PostMapping("/auto-capture/off")
    public ResponseEntity<String> disableAutoCapture() {
        scanner.setAutoCaptureEnabled(false);
        return ResponseEntity.ok("Auto capture DISABLED");
    }

    @GetMapping("/auto-capture/status")
    public ResponseEntity<String> getAutoCaptureStatus() {
        return ResponseEntity.ok(scanner.isAutoCaptureEnabled() ? "Auto capture ON" : "Auto capture OFF");
    }

    @GetMapping("/auto-capture/interval")
    public Map<String, Long> getCaptureInterval() {
        return Map.of("intervalMs", scanner.getCaptureInterval());
    }

    @PostMapping("/auto-capture/interval")
    public ResponseEntity<String> setCaptureInterval(@RequestBody Map<String, Long> request) {
        Long intervalMs = request.get("intervalMs");
        if (intervalMs != null && intervalMs > 0) {
            scanner.setCaptureInterval(intervalMs);
            return ResponseEntity.ok("Capture interval updated to " + intervalMs + "ms");
        }
        return ResponseEntity.badRequest().body("Invalid interval");
    }

    @GetMapping("/auto-capture/room")
    public Map<String, String> getTargetRoom() {
        return Map.of("roomNumber", scanner.getTargetRoom());
    }

    @PostMapping("/auto-capture/room")
    public ResponseEntity<String> setTargetRoom(@RequestBody Map<String, String> request) {
        String roomNumber = request.get("roomNumber");
        if (roomNumber != null && !roomNumber.trim().isEmpty()) {
            scanner.setTargetRoom(roomNumber);
            return ResponseEntity.ok("Target room updated to " + roomNumber);
        }
        return ResponseEntity.badRequest().body("Invalid room number");
    }

    @GetMapping("/auto-capture/info")
    public Map<String, Object> getAutoCaptureInfo() {
        Map<String, Object> info = new HashMap<>();
        info.put("enabled", scanner.isAutoCaptureEnabled());
        info.put("intervalMs", scanner.getCaptureInterval());
        info.put("targetRoom", scanner.getTargetRoom());
        return info;
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
    public ResponseEntity<?> ocrCccd(@RequestParam("frontImage") org.springframework.web.multipart.MultipartFile frontImage,
                                     @RequestParam("backImage") org.springframework.web.multipart.MultipartFile backImage) {
        try {
            Map<String, Object> result = ocrCccdService.ocrCccd(frontImage, backImage);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error processing CCCD: " + e.getMessage());
        }
    }
} 