package com.mpbhms.backend.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import com.mpbhms.backend.util.FileMultipartFile;

import java.io.*;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.concurrent.atomic.AtomicBoolean;
import com.mpbhms.backend.repository.RoomRepository;
import com.mpbhms.backend.entity.Room;
import java.util.Optional;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;
import java.util.concurrent.ScheduledFuture;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.awt.image.BufferedImage;
import javax.imageio.ImageIO;
import java.awt.Rectangle;
import java.awt.Robot;
import java.awt.Toolkit;
import java.awt.GraphicsEnvironment;
import java.awt.AWTException;

@Service
public class AutoElectricMeterScanner {
    private final ElectricMeterDetectionService detectionService;
    private final ScanLogService scanLogService;
    private final RoomRepository roomRepository;
    private String scanFolder;
    private final AtomicBoolean enabled = new AtomicBoolean(false);
    private final AtomicBoolean autoCaptureEnabled = new AtomicBoolean(false);
    private volatile String currentScanningFile = null;
    private long intervalMs = 10000; // mặc định 10s
    private long captureIntervalMs = 30000; // mặc định 30s cho auto capture
    private final TaskScheduler taskScheduler;
    private final TaskScheduler captureTaskScheduler;
    private ScheduledFuture<?> scheduledFuture;
    private ScheduledFuture<?> captureScheduledFuture;
    private String targetRoomNumber = "A101"; // Phòng mặc định để chụp

    public AutoElectricMeterScanner(ElectricMeterDetectionService detectionService,
                                    ScanLogService scanLogService,
                                    RoomRepository roomRepository,
                                    @Value("${meter.scan.folder}") String scanFolder) {
        this.detectionService = detectionService;
        this.scanLogService = scanLogService;
        this.roomRepository = roomRepository;
        this.scanFolder = scanFolder;
        
        // Scheduler cho scan
        ThreadPoolTaskScheduler scheduler = new ThreadPoolTaskScheduler();
        scheduler.setPoolSize(1);
        scheduler.setThreadNamePrefix("AutoElectricMeterScanner-");
        scheduler.initialize();
        this.taskScheduler = scheduler;
        
        // Scheduler riêng cho capture
        ThreadPoolTaskScheduler captureScheduler = new ThreadPoolTaskScheduler();
        captureScheduler.setPoolSize(1);
        captureScheduler.setThreadNamePrefix("AutoCapture-");
        captureScheduler.initialize();
        this.captureTaskScheduler = captureScheduler;
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

    // Auto capture methods
    public void startAutoCapture() {
        if (captureScheduledFuture != null && !captureScheduledFuture.isCancelled()) return;
        captureScheduledFuture = captureTaskScheduler.scheduleWithFixedDelay(this::captureImage, captureIntervalMs);
        System.out.println("🤖 Auto capture started with interval: " + captureIntervalMs + "ms");
    }

    public void stopAutoCapture() {
        if (captureScheduledFuture != null) {
            captureScheduledFuture.cancel(false);
            captureScheduledFuture = null;
        }
        System.out.println("⏹️ Auto capture stopped");
    }

    public void setCaptureInterval(long intervalMs) {
        this.captureIntervalMs = intervalMs;
        if (autoCaptureEnabled.get()) {
            stopAutoCapture();
            startAutoCapture();
        }
    }

    public long getCaptureInterval() {
        return captureIntervalMs;
    }

    public void setTargetRoom(String roomNumber) {
        this.targetRoomNumber = roomNumber;
    }

    public String getTargetRoom() {
        return targetRoomNumber;
    }

    public void setAutoCaptureEnabled(boolean enable) {
        this.autoCaptureEnabled.set(enable);
        if (enable) {
            startAutoCapture();
        } else {
            stopAutoCapture();
        }
    }

    public boolean isAutoCaptureEnabled() {
        return this.autoCaptureEnabled.get();
    }

    // Capture image using screen capture (simulating webcam)
    public void captureImage() {
        if (!autoCaptureEnabled.get()) return;
        
        try {
            System.out.println("📸 Auto capturing image for room: " + targetRoomNumber);
            
            // Tìm room ID
            Optional<Room> roomOpt = roomRepository.findByRoomNumberAndDeletedFalse(targetRoomNumber);
            if (roomOpt.isEmpty()) {
                System.out.println("❌ Room not found: " + targetRoomNumber);
                return;
            }
            
            Long roomId = roomOpt.get().getId();
            
            // Tạo folder cho room nếu chưa có
            Path roomDirectory = Paths.get(scanFolder, targetRoomNumber);
            Files.createDirectories(roomDirectory);
            
            // Tạo tên file với timestamp
            LocalDateTime now = LocalDateTime.now();
            String timestamp = now.format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
            String filename = String.format("electric_meter_%s_%s.jpg", targetRoomNumber, timestamp);
            Path filePath = roomDirectory.resolve(filename);
            
            // Capture screen (simulating webcam capture)
            // Trong thực tế, đây sẽ là webcam capture
            BufferedImage screenshot = captureScreen();
            if (screenshot != null) {
                ImageIO.write(screenshot, "jpg", filePath.toFile());
                System.out.println("📸 Captured image saved: " + filePath.toString());
                
                // Tự động scan ngay sau khi capture
                try {
                    Thread.sleep(2000); // Đợi 2 giây để file được lưu hoàn toàn
                    scanFolder(); // Scan ngay lập tức
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
            } else {
                System.err.println("❌ Failed to capture screen - screenshot is null");
            }
            
        } catch (Exception e) {
            System.err.println("❌ Error during auto capture: " + e.getMessage());
            e.printStackTrace();
        }
    }

    // Simulate screen capture (in real implementation, this would be webcam capture)
    private BufferedImage captureScreen() {
        try {
            // Check if we're running in a headless environment
            if (GraphicsEnvironment.isHeadless()) {
                System.err.println("❌ Cannot capture screen in headless environment");
                return null;
            }
            
            Robot robot = new Robot();
            Rectangle screenRect = new Rectangle(Toolkit.getDefaultToolkit().getScreenSize());
            BufferedImage screenshot = robot.createScreenCapture(screenRect);
            
            if (screenshot == null) {
                System.err.println("❌ Robot.createScreenCapture returned null");
                return null;
            }
            
            System.out.println("📸 Screen captured successfully: " + screenshot.getWidth() + "x" + screenshot.getHeight());
            return screenshot;
            
        } catch (AWTException e) {
            System.err.println("❌ AWTException during screen capture: " + e.getMessage());
            return null;
        } catch (Exception e) {
            System.err.println("❌ Error capturing screen: " + e.getMessage());
            return null;
        }
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