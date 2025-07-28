package com.mpbhms.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mpbhms.backend.entity.Room;
import com.mpbhms.backend.entity.CustomService;
import com.mpbhms.backend.entity.ServiceReading;
import com.mpbhms.backend.enums.ServiceType;
import com.mpbhms.backend.repository.RoomRepository;
import com.mpbhms.backend.repository.ServiceReadingRepository;
import com.mpbhms.backend.repository.ServiceRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.IOException;
import java.math.BigDecimal;
import java.net.URI;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Optional;

@Service
public class ElectricMeterDetectionService {

    @Value("${azure.prediction.url.image}")
    private String imagePredictionUrl;

    @Value("${azure.prediction.key}")
    private String predictionKey;

    @Value("${azure.ocr.endpoint}")
    private String ocrEndpoint;

    @Value("${azure.ocr.key}")
    private String ocrKey;

    // Base path for saving images - can be configured via application.properties
    @Value("${app.image.storage.path:C:/Users/yugio/OneDrive/Desktop/New folder (2)/SEP490_G12_MP-BHMS/frontend/public/img/ocr}")
    private String imageStoragePath;

    @Autowired
    private ServiceRepository serviceRepository;

    @Autowired
    private RoomRepository roomRepository;

    @Autowired
    private ServiceReadingRepository serviceReadingRepository;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    // New method that combines OCR detection and image saving
    public String detectReadAndSaveImage(MultipartFile file, Long roomId) throws IOException, InterruptedException {
        try {
            System.out.println("Starting detectReadAndSaveImage - roomId: " + roomId);
            
            String result = detectAndReadFromFile(file);
            System.out.println("OCR result: " + result);
            
            // Save the image to filesystem regardless of OCR result
            if (roomId != null) {
                saveImageToFileSystem(file, roomId);
            }
            
            // If OCR was successful, save the reading to database
            if (result.matches("\\d{5}(\\.\\d)?")) {
                System.out.println("Saving reading to database: " + result);
                saveElectricReading(result, roomId);
            }
            
            return result;
        } catch (Exception e) {
            System.err.println("Error in detectReadAndSaveImage: " + e.getMessage());
            e.printStackTrace();
            throw e;
        }
    }

    public String detectAndReadFromFile(MultipartFile file, Long roomId) throws IOException, InterruptedException {
        String result = detectAndReadFromFile(file);
        if (result.matches("\\d{5}(\\.\\d)?")) {
            saveElectricReading(result, roomId);
        }
        return result;
    }

    /**
     * Save the captured image to the filesystem with proper folder structure
     */
    private void saveImageToFileSystem(MultipartFile file, Long roomId) throws IOException {
        try {
            System.out.println("Starting saveImageToFileSystem - roomId: " + roomId + ", imageStoragePath: " + imageStoragePath);
            
            // Get room information
            Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy phòng với ID: " + roomId));
            
            System.out.println("Found room: " + room.getRoomNumber());
            
            // Create directory path: /img/ocr/{roomNumber}
            String roomNumber = room.getRoomNumber();
            Path roomDirectory = Paths.get(imageStoragePath, roomNumber);
            
            System.out.println("Creating directory: " + roomDirectory.toString());
            
            // Create directories if they don't exist
            Files.createDirectories(roomDirectory);
            
            // Generate filename with timestamp
            LocalDateTime now = LocalDateTime.now();
            String timestamp = now.format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
            String originalFilename = file.getOriginalFilename();
            String extension = originalFilename != null && originalFilename.contains(".") 
                ? originalFilename.substring(originalFilename.lastIndexOf("."))
                : ".jpg";
            
            String filename = String.format("electric_meter_%s_%s%s", roomNumber, timestamp, extension);
            Path filePath = roomDirectory.resolve(filename);
            
            System.out.println("Saving file to: " + filePath.toString());
            
            // Save the file
            Files.write(filePath, file.getBytes());
            
            System.out.println("Image saved successfully: " + filePath.toString());
        } catch (Exception e) {
            System.err.println("Error in saveImageToFileSystem: " + e.getMessage());
            e.printStackTrace();
            throw e;
        }
    }

    /**
     * Save the captured image to the filesystem only (without OCR)
     */
    public void saveImageToFileSystemOnly(MultipartFile file, Long roomId) throws IOException {
        saveImageToFileSystem(file, roomId);
    }

    public String detectAndReadFromFile(MultipartFile file) throws IOException, InterruptedException {
        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            return "File không hợp lệ: chỉ chấp nhận ảnh (jpg, png, bmp, gif)";
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_OCTET_STREAM);
        headers.set("Prediction-Key", predictionKey);
        HttpEntity<byte[]> entity = new HttpEntity<>(file.getBytes(), headers);
        ResponseEntity<String> response = restTemplate.exchange(imagePredictionUrl, HttpMethod.POST, entity, String.class);

        JsonNode json = objectMapper.readTree(response.getBody());

        JsonNode bestBox = null;
        double bestProbability = 0.9;

        for (JsonNode prediction : json.get("predictions")) {
            double probability = prediction.get("probability").asDouble();
            if (probability > bestProbability) {
                bestProbability = probability;
                bestBox = prediction.get("boundingBox");
            }
        }

        if (bestBox == null) return "Không tìm thấy vùng chỉ số có độ tin cậy cao";

        BufferedImage original = ImageIO.read(file.getInputStream());
        int width = original.getWidth();
        int height = original.getHeight();

        int x = (int) (bestBox.get("left").asDouble() * width);
        int y = (int) (bestBox.get("top").asDouble() * height);
        int w = (int) (bestBox.get("width").asDouble() * width);
        int h = (int) (bestBox.get("height").asDouble() * height);

        x = Math.max(0, x);
        y = Math.max(0, y);
        w = Math.min(width - x, w);
        h = Math.min(height - y, h);

        BufferedImage cropped = original.getSubimage(x, y, w, h);

        if (w < 50 || h < 50) {
            int newW = Math.max(200, w * 4);
            int newH = Math.max(80, h * 4);
            BufferedImage resized = new BufferedImage(newW, newH, BufferedImage.TYPE_INT_RGB);
            Graphics2D g2d = resized.createGraphics();
            g2d.drawImage(cropped, 0, 0, newW, newH, null);
            g2d.dispose();
            cropped = resized;
        }

        ByteArrayOutputStream outStream = new ByteArrayOutputStream();
        ImageIO.write(cropped, "jpg", outStream);
        byte[] croppedBytes = outStream.toByteArray();

        HttpHeaders ocrHeaders = new HttpHeaders();
        ocrHeaders.setContentType(MediaType.APPLICATION_OCTET_STREAM);
        ocrHeaders.set("Ocp-Apim-Subscription-Key", ocrKey);

        HttpEntity<byte[]> ocrEntity = new HttpEntity<>(croppedBytes, ocrHeaders);
        ResponseEntity<Void> ocrInit = restTemplate.postForEntity(ocrEndpoint + "/vision/v3.2/read/analyze", ocrEntity, Void.class);
        String operationUrl = ocrInit.getHeaders().getFirst("Operation-Location");
        if (operationUrl == null) return "Lỗi: Không nhận được Operation-Location";

        for (int i = 0; i < 10; i++) {
            Thread.sleep(1000);
            HttpEntity<Void> getEntity = new HttpEntity<>(ocrHeaders);
            ResponseEntity<String> ocrResult = restTemplate.exchange(URI.create(operationUrl), HttpMethod.GET, getEntity, String.class);
            JsonNode resultJson = objectMapper.readTree(ocrResult.getBody());

            if ("succeeded".equals(resultJson.path("status").asText())) {
                StringBuilder sb = new StringBuilder();
                for (JsonNode line : resultJson.at("/analyzeResult/readResults/0/lines")) {
                    sb.append(line.get("text").asText()).append(" ");
                }

                String resultDigits = sb.toString().replaceAll("[^0-9]", "").trim();

                // Nếu có 6 số, chỉ lấy 5 số đầu (bỏ số đỏ)
                if (resultDigits.length() == 6) return resultDigits.substring(0, 5);
                // Nếu có 5 số, lấy nguyên 5 số
                if (resultDigits.length() == 5) return resultDigits;
                // Trường hợp khác, trả về thông báo không quét được
                return "Không quét được chỉ số điện";
            }
        }

        return "OCR timeout after 10 seconds";
    }

    public void saveElectricReading(String resultValue, Long roomId) {
        // Lấy phần số trước dấu chấm nếu có
        String valueToSave = resultValue.split("\\.")[0];
        CustomService electricityCustomService = serviceRepository.findByServiceType(ServiceType.ELECTRICITY);
        if (electricityCustomService == null) throw new RuntimeException("Không tìm thấy dịch vụ ĐIỆN");

        Room room = roomRepository.findById(roomId).orElseThrow(() -> new RuntimeException("Không tìm thấy phòng"));

        Optional<ServiceReading> latestOpt = serviceReadingRepository.findTopByRoomAndServiceOrderByCreatedDateDesc(room, electricityCustomService);
        if (latestOpt.isPresent()) {
            ServiceReading latest = latestOpt.get();
            latest.setOldReading(latest.getNewReading());
            latest.setNewReading(new BigDecimal(valueToSave));
            latest.setUpdatedDate(Instant.now());
            latest.setUpdatedBy("OCR");
            serviceReadingRepository.save(latest);
        } else {
            ServiceReading reading = new ServiceReading();
            reading.setRoom(room);
            reading.setService(electricityCustomService);
            reading.setOldReading(BigDecimal.ZERO);
            reading.setNewReading(new BigDecimal(valueToSave));
            reading.setCreatedDate(Instant.now());
            reading.setCreatedBy("OCR");
            serviceReadingRepository.save(reading);
        }
    }
}