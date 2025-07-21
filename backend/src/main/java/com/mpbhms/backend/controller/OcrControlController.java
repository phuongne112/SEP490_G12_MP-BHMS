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
import org.springframework.web.multipart.MultipartFile;

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
    public ResponseEntity<String> setScanInterval(@RequestBody Map<String, Long> body) {
        Long interval = body.get("intervalMs");
        if (interval == null || interval < 1000) {
            return ResponseEntity.badRequest().body("Interval phải >= 1000 ms");
        }
        scanner.setInterval(interval);
        return ResponseEntity.ok("Interval updated to " + interval + " ms");
    }

    @GetMapping("/scan-logs")
    public Page<ScanLog> getScanLogs(@RequestParam(defaultValue = "0") int page,
                                     @RequestParam(defaultValue = "10") int size,
                                     @RequestParam(required = false) Long roomId) {
        if (roomId != null) {
            return scanLogService.getScanLogsByRoomId(roomId, PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "scanTime")));
        } else {
            return scanLogService.getScanLogs(PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "scanTime")));
        }
    }

    @GetMapping("/scan-images")
    public List<String> getScanImages() {
        File folder = new File(scanner.getScanFolder());
        if (!folder.exists() || !folder.isDirectory()) return List.of();
        String[] files = folder.list((dir, name) -> name.matches("room_.*\\.(jpg|png|jpeg)$"));
        return files != null ? Arrays.asList(files) : List.of();
    }

    @GetMapping("/current-scanning-image")
    public Map<String, String> getCurrentScanningImage() {
        String file = scanner.getCurrentScanningFile();
        return Map.of("current", file == null ? "" : file);
    }

    @PostMapping("/cccd")
    public Map<String, Object> ocrCccd(@RequestParam("front") MultipartFile front,
                                       @RequestParam("back") MultipartFile back) throws Exception {
        return ocrCccdService.ocrCccd(front, back);
    }
} 