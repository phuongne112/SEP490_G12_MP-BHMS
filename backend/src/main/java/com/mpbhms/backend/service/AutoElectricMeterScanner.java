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
import org.springframework.scheduling.TaskScheduler;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;
import java.util.concurrent.ScheduledFuture;

@Service
public class AutoElectricMeterScanner {
    private final ElectricMeterDetectionService detectionService;
    private final ScanLogService scanLogService;
    private final RoomRepository roomRepository;
    private String scanFolder;
    private final AtomicBoolean enabled = new AtomicBoolean(false);
    private volatile String currentScanningFile = null;
    private long intervalMs = 10000; // mặc định 10s
    private final TaskScheduler taskScheduler;
    private ScheduledFuture<?> scheduledFuture;

    public AutoElectricMeterScanner(ElectricMeterDetectionService detectionService,
                                    ScanLogService scanLogService,
                                    RoomRepository roomRepository,
                                    @Value("${meter.scan.folder}") String scanFolder) {
        this.detectionService = detectionService;
        this.scanLogService = scanLogService;
        this.roomRepository = roomRepository;
        this.scanFolder = scanFolder;
        ThreadPoolTaskScheduler scheduler = new ThreadPoolTaskScheduler();
        scheduler.setPoolSize(1);
        scheduler.setThreadNamePrefix("AutoElectricMeterScanner-");
        scheduler.initialize();
        this.taskScheduler = scheduler;
    }

    public void start() {
        if (scheduledFuture != null && !scheduledFuture.isCancelled()) return;
        scheduledFuture = taskScheduler.scheduleWithFixedDelay(this::scanFolder, intervalMs);
    }

    public void stop() {
        if (scheduledFuture != null) {
            scheduledFuture.cancel(false);
            scheduledFuture = null;
        }
    }

    public void setInterval(long intervalMs) {
        this.intervalMs = intervalMs;
        if (enabled.get()) {
            stop();
            start();
        }
    }

    public long getInterval() {
        return intervalMs;
    }

    // Bỏ annotation @Scheduled
    public void scanFolder() {
        System.out.println("Auto scan is running, enabled=" + enabled.get());
        if (!enabled.get()) return;
        File rootFolder = new File(scanFolder);
        if (!rootFolder.exists() || !rootFolder.isDirectory()) return;
        File[] roomFolders = rootFolder.listFiles(File::isDirectory);
        if (roomFolders == null || roomFolders.length == 0) return;
        for (File roomFolder : roomFolders) {
            String roomNumber = roomFolder.getName();
            Optional<Room> roomOpt = roomRepository.findByRoomNumberAndDeletedFalse(roomNumber);
            if (roomOpt.isEmpty()) continue;
            Long roomId = roomOpt.get().getId();
            File[] files = roomFolder.listFiles(file -> file.isFile() && file.getName().matches(".*\\.(jpg|png|jpeg)$") && !file.getName().startsWith("processed_"));
            if (files == null || files.length == 0) continue;
            // Lọc ra file chưa được xử lý (chưa có file processed_<tên cũ>)
            File nextFile = java.util.Arrays.stream(files)
                .filter(f -> !new File(roomFolder, "processed_" + f.getName()).exists())
                .sorted((f1, f2) -> f1.getName().compareToIgnoreCase(f2.getName()))
                .findFirst()
                .orElse(null);
            if (nextFile != null) {
                currentScanningFile = nextFile.getName();
                String result = null;
                String error = null;
                try {
                    MultipartFile multipartFile = new FileMultipartFile(nextFile, "image/jpeg");
                    result = detectionService.detectAndReadFromFile(multipartFile, roomId);
                    System.out.println("📸 Đã quét " + nextFile.getName() + " → " + result);
                    File processedFile = new File(roomFolder, "processed_" + nextFile.getName());
                    System.out.println("Đổi tên từ: " + nextFile.getAbsolutePath() + " sang: " + processedFile.getAbsolutePath());
                    boolean renamed = nextFile.renameTo(processedFile);
                    if (!renamed) {
                        System.out.println("Không thể đổi tên file: " + nextFile.getAbsolutePath() + " sang: " + processedFile.getAbsolutePath());
                        // Thử copy rồi xóa file gốc (trường hợp khác phân vùng hoặc renameTo thất bại)
                        try (java.io.InputStream in = new java.io.FileInputStream(nextFile);
                             java.io.OutputStream out = new java.io.FileOutputStream(processedFile)) {
                            in.transferTo(out);
                            boolean deleted = nextFile.delete();
                            if (!deleted) {
                                System.out.println("Không thể xóa file gốc sau khi copy: " + nextFile.getAbsolutePath());
                            }
                        } catch (Exception ex) {
                            System.out.println("Lỗi khi copy rồi xóa file: " + ex.getMessage());
                        }
                    } else {
                        // Nếu file gốc vẫn còn (do lỗi move), xóa file gốc để tránh bị quét lại
                        if (nextFile.exists()) {
                            boolean deleted = nextFile.delete();
                            if (!deleted) {
                                System.out.println("Không thể xóa file gốc: " + nextFile.getAbsolutePath());
                            }
                        }
                    }
                } catch (Exception e) {
                    error = e.getMessage();
                    e.printStackTrace();
                }
                scanLogService.saveLog(nextFile.getName(), roomId, result, error);
            }
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
        if (enable) {
            start();
        } else {
            stop();
        }
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