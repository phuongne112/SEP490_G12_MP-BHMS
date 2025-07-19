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

    @GetMapping("/scan-logs")
    public Page<ScanLog> getScanLogs(@RequestParam(defaultValue = "0") int page,
                                     @RequestParam(defaultValue = "10") int size) {
        return scanLogService.getScanLogs(PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "scanTime")));
    }

    @GetMapping("/scan-folder")
    public Map<String, String> getScanFolder() {
        return Map.of("scanFolder", scanner.getScanFolder());
    }

    @PostMapping("/scan-folder")
    public ResponseEntity<String> setScanFolder(@RequestBody Map<String, String> body) {
        String folder = body.get("scanFolder");
        if (folder == null || folder.isBlank()) {
            return ResponseEntity.badRequest().body("Missing scanFolder");
        }
        scanner.setScanFolder(folder);
        return ResponseEntity.ok("Scan folder updated");
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