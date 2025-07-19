package com.mpbhms.backend.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import com.mpbhms.backend.util.FileMultipartFile;

import java.io.*;
import java.util.concurrent.atomic.AtomicBoolean;
import com.mpbhms.backend.repository.RoomRepository;
import com.mpbhms.backend.entity.Room;
import java.util.Optional;

@Service
public class AutoElectricMeterScanner {
    private final ElectricMeterDetectionService detectionService;
    private final ScanLogService scanLogService;
    private final RoomRepository roomRepository;
    private String scanFolder;
    private final AtomicBoolean enabled = new AtomicBoolean(false);
    private volatile String currentScanningFile = null;

    public AutoElectricMeterScanner(ElectricMeterDetectionService detectionService,
                                    ScanLogService scanLogService,
                                    RoomRepository roomRepository,
                                    @Value("${meter.scan.folder}") String scanFolder) {
        this.detectionService = detectionService;
        this.scanLogService = scanLogService;
        this.roomRepository = roomRepository;
        this.scanFolder = scanFolder;
    }

    @Scheduled(fixedDelay = 10000)
    public void scanFolder() {
        System.out.println("Auto scan is running, enabled=" + enabled.get());
        if (!enabled.get()) return;
        File folder = new File(scanFolder);
        if (!folder.exists()) return;
        File[] files = folder.listFiles(file -> file.isFile() && file.getName().matches("room_.*\\.(jpg|png|jpeg)$") && !file.getName().startsWith("processed_"));
        if (files == null || files.length == 0) return;
        for (File file : files) {
            currentScanningFile = file.getName();
            String result = null;
            String error = null;
            Long roomId = null;
            try {
                String roomNumber = extractRoomNumber(file.getName());
                if (roomNumber == null) {
                    error = "Không tìm được roomNumber từ tên file";
                    scanLogService.saveLog(file.getName(), null, null, error);
                    continue;
                }
                Optional<Room> roomOpt = roomRepository.findByRoomNumberAndDeletedFalse(roomNumber);
                if (roomOpt.isEmpty()) {
                    error = "Không tìm thấy phòng với roomNumber: " + roomNumber;
                    scanLogService.saveLog(file.getName(), null, null, error);
                    continue;
                }
                roomId = roomOpt.get().getId();
                MultipartFile multipartFile = new FileMultipartFile(
                        file, "image/jpeg");
                result = detectionService.detectAndReadFromFile(multipartFile, roomId);
                System.out.println("📸 Đã quét " + file.getName() + " → " + result);
                boolean renamed = file.renameTo(new File(folder, "processed_" + file.getName()));
                if (!renamed) {
                    System.out.println("Không thể đổi tên file: " + file.getName());
                }
            } catch (Exception e) {
                error = e.getMessage();
                e.printStackTrace();
            }
            scanLogService.saveLog(file.getName(), roomId, result, error);
        }
        currentScanningFile = null;
    }

    private String extractRoomNumber(String fileName) {
        try {
            String[] parts = fileName.split("_");
            return parts[1];
        } catch (Exception e) {
            return null;
        }
    }

    public void setEnabled(boolean enable) {
        this.enabled.set(enable);
    }

    public boolean isEnabled() {
        return this.enabled.get();
    }

    public String getScanFolder() {
        return scanFolder;
    }
    public void setScanFolder(String folder) {
        this.scanFolder = folder;
    }

    public String getCurrentScanningFile() {
        return currentScanningFile;
    }
} 