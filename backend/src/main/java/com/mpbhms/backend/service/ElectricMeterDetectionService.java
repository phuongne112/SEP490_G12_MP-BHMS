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
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

/**
 * Dịch vụ quét OCR chỉ số điện
 * Hỗ trợ nhiều loại đồng hồ điện khác nhau với độ chính xác cao
 */
@Service
public class ElectricMeterDetectionService {

    // URL API Azure Custom Vision để nhận diện vùng đồng hồ
    @Value("${azure.prediction.url.image}")
    private String imagePredictionUrl;

    // Khóa API Azure Custom Vision
    @Value("${azure.prediction.key}")
    private String predictionKey;

    // Endpoint Azure Computer Vision cho OCR
    @Value("${azure.ocr.endpoint}")
    private String ocrEndpoint;

    // Khóa API Azure Computer Vision
    @Value("${azure.ocr.key}")
    private String ocrKey;

    // Đường dẫn lưu ảnh - có thể cấu hình trong application.properties
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

    /**
     * Phương thức chính: Quét OCR và lưu ảnh
     * Kết hợp việc quét chỉ số và lưu ảnh vào hệ thống
     */
    public String detectReadAndSaveImage(MultipartFile file, Long roomId) throws IOException, InterruptedException {
        try {
            System.out.println("Bắt đầu quét OCR và lưu ảnh - Phòng ID: " + roomId);
            
            String result = detectAndReadFromFile(file);
            System.out.println("Kết quả OCR: " + result);
            
            // Lưu ảnh vào hệ thống file bất kể kết quả OCR
            if (roomId != null) {
                saveImageToFileSystem(file, roomId);
            }
            
            // Nếu OCR thành công, lưu chỉ số vào database
            if (isValidReading(result)) {
                System.out.println("Lưu chỉ số vào database: " + result);
                saveElectricReading(result, roomId);
            }
            
            return result;
        } catch (Exception e) {
            System.err.println("Lỗi trong detectReadAndSaveImage: " + e.getMessage());
            e.printStackTrace();
            throw e;
        }
    }

    /**
     * Quét OCR và lưu chỉ số cho phòng cụ thể
     */
    public String detectAndReadFromFile(MultipartFile file, Long roomId) throws IOException, InterruptedException {
        String result = detectAndReadFromFile(file);
        if (isValidReading(result)) {
            saveElectricReading(result, roomId);
        }
        return result;
    }

    /**
     * Lưu ảnh đã chụp vào hệ thống file với cấu trúc thư mục phù hợp
     */
    private void saveImageToFileSystem(MultipartFile file, Long roomId) throws IOException {
        try {
            System.out.println("Bắt đầu lưu ảnh - Phòng ID: " + roomId + ", Đường dẫn: " + imageStoragePath);
            
            // Lấy thông tin phòng
            Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy phòng với ID: " + roomId));
            
            System.out.println("Tìm thấy phòng: " + room.getRoomNumber());
            
            // Tạo đường dẫn thư mục: /img/ocr/{số phòng}
            String roomNumber = room.getRoomNumber();
            Path roomDirectory = Paths.get(imageStoragePath, roomNumber);
            
            System.out.println("Tạo thư mục: " + roomDirectory.toString());
            
            // Tạo thư mục nếu chưa tồn tại
            Files.createDirectories(roomDirectory);
            
            // Tạo tên file với timestamp
            LocalDateTime now = LocalDateTime.now();
            String timestamp = now.format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
            String originalFilename = file.getOriginalFilename();
            String extension = originalFilename != null && originalFilename.contains(".") 
                ? originalFilename.substring(originalFilename.lastIndexOf("."))
                : ".jpg";
            
            String filename = String.format("electric_meter_%s_%s%s", roomNumber, timestamp, extension);
            Path filePath = roomDirectory.resolve(filename);
            
            System.out.println("Lưu file tại: " + filePath.toString());
            
            // Lưu file
            Files.write(filePath, file.getBytes());
            
            System.out.println("Lưu ảnh thành công: " + filePath.toString());
        } catch (Exception e) {
            System.err.println("Lỗi trong saveImageToFileSystem: " + e.getMessage());
            e.printStackTrace();
            throw e;
        }
    }

    /**
     * Chỉ lưu ảnh vào hệ thống file (không quét OCR)
     */
    public void saveImageToFileSystemOnly(MultipartFile file, Long roomId) throws IOException {
        saveImageToFileSystem(file, roomId);
    }

    /**
     * Phương thức chính quét OCR từ file
     * Sử dụng nhiều phương pháp khác nhau để tăng độ chính xác
     */
    public String detectAndReadFromFile(MultipartFile file) throws IOException, InterruptedException {
        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            return "File không hợp lệ: chỉ chấp nhận ảnh (jpg, png, bmp, gif)";
        }

        // Thử nhiều phương pháp khác nhau để tăng độ chính xác
        List<String> results = new ArrayList<>();
        
        // Phương pháp 1: Sử dụng Custom Vision để nhận diện vùng đồng hồ
        String result1 = detectWithCustomVision(file);
        if (isValidReading(result1)) {
            return result1;
        }
        results.add(result1);
        
        // Phương pháp 2: OCR trực tiếp trên toàn bộ ảnh
        String result2 = detectWithDirectOcr(file);
        if (isValidReading(result2)) {
            return result2;
        }
        results.add(result2);
        
        // Phương pháp 3: Xử lý ảnh nâng cao + OCR
        String result3 = detectWithEnhancedPreprocessing(file);
        if (isValidReading(result3)) {
            return result3;
        }
        results.add(result3);
        
        // Nếu tất cả phương pháp đều thất bại, trả về kết quả tốt nhất
        String bestResult = getBestResult(results);
        if (bestResult != null) {
            return bestResult;
        }
        
        return "Không quét được chỉ số điện";
    }

    /**
     * Phương pháp 1: Sử dụng Azure Custom Vision để nhận diện vùng đồng hồ
     */
    public String detectWithCustomVision(MultipartFile file) throws IOException, InterruptedException {
        try {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_OCTET_STREAM);
        headers.set("Prediction-Key", predictionKey);
        HttpEntity<byte[]> entity = new HttpEntity<>(file.getBytes(), headers);
        ResponseEntity<String> response = restTemplate.exchange(imagePredictionUrl, HttpMethod.POST, entity, String.class);

        JsonNode json = objectMapper.readTree(response.getBody());

            // Thử nhiều bounding box với các ngưỡng xác suất khác nhau
            List<JsonNode> validBoxes = new ArrayList<>();
        for (JsonNode prediction : json.get("predictions")) {
            double probability = prediction.get("probability").asDouble();
                if (probability > 0.7) { // Giảm ngưỡng để nhận diện tốt hơn
                    validBoxes.add(prediction.get("boundingBox"));
                }
            }

            if (validBoxes.isEmpty()) {
                return "Không tìm thấy vùng chỉ số có độ tin cậy cao";
            }

            // Thử từng bounding box
            for (JsonNode bestBox : validBoxes) {
                String result = processBoundingBox(file, bestBox);
                if (isValidReading(result)) {
                    return result;
                }
            }

            // Nếu không có kết quả hợp lệ, trả về lần thử đầu tiên
            return processBoundingBox(file, validBoxes.get(0));
        } catch (Exception e) {
            System.err.println("Lỗi trong detectWithCustomVision: " + e.getMessage());
            return "Lỗi Custom Vision: " + e.getMessage();
        }
    }

    /**
     * Phương pháp 2: OCR trực tiếp trên toàn bộ ảnh
     */
    public String detectWithDirectOcr(MultipartFile file) throws IOException, InterruptedException {
        try {
            // Xử lý ảnh trước khi OCR để tăng độ chính xác
            BufferedImage original = ImageIO.read(file.getInputStream());
            BufferedImage enhanced = enhanceImage(original);
            
            ByteArrayOutputStream outStream = new ByteArrayOutputStream();
            ImageIO.write(enhanced, "jpg", outStream);
            byte[] enhancedBytes = outStream.toByteArray();

            return performOcr(enhancedBytes);
        } catch (Exception e) {
            System.err.println("Lỗi trong detectWithDirectOcr: " + e.getMessage());
            return "Lỗi OCR trực tiếp: " + e.getMessage();
        }
    }

    /**
     * Phương pháp 3: Xử lý ảnh nâng cao + OCR
     */
    public String detectWithEnhancedPreprocessing(MultipartFile file) throws IOException, InterruptedException {
        try {
            BufferedImage original = ImageIO.read(file.getInputStream());
            
            // Thử các kỹ thuật xử lý ảnh khác nhau
            List<BufferedImage> processedImages = new ArrayList<>();
            
            // Ảnh gốc
            processedImages.add(original);
            
            // Tăng độ tương phản
            processedImages.add(enhanceImage(original));
            
            // Chuyển sang grayscale với độ tương phản cao
            processedImages.add(convertToGrayscale(original));
            
            // Các phiên bản thay đổi kích thước
            processedImages.add(resizeImage(original, 2.0));
            processedImages.add(resizeImage(original, 0.5));

            // Thử OCR trên từng ảnh đã xử lý
            for (BufferedImage img : processedImages) {
                ByteArrayOutputStream outStream = new ByteArrayOutputStream();
                ImageIO.write(img, "jpg", outStream);
                byte[] imgBytes = outStream.toByteArray();
                
                String result = performOcr(imgBytes);
                if (isValidReading(result)) {
                    return result;
                }
            }
            
            return "Không quét được sau xử lý ảnh";
        } catch (Exception e) {
            System.err.println("Lỗi trong detectWithEnhancedPreprocessing: " + e.getMessage());
            return "Lỗi xử lý ảnh: " + e.getMessage();
        }
    }

    /**
     * Xử lý bounding box được phát hiện từ Custom Vision
     */
    private String processBoundingBox(MultipartFile file, JsonNode boundingBox) throws IOException, InterruptedException {
        BufferedImage original = ImageIO.read(file.getInputStream());
        int width = original.getWidth();
        int height = original.getHeight();

        int x = (int) (boundingBox.get("left").asDouble() * width);
        int y = (int) (boundingBox.get("top").asDouble() * height);
        int w = (int) (boundingBox.get("width").asDouble() * width);
        int h = (int) (boundingBox.get("height").asDouble() * height);

        // Thêm padding xung quanh bounding box
        int padding = Math.min(w, h) / 4;
        x = Math.max(0, x - padding);
        y = Math.max(0, y - padding);
        w = Math.min(width - x, w + 2 * padding);
        h = Math.min(height - y, h + 2 * padding);

        BufferedImage cropped = original.getSubimage(x, y, w, h);

        // Tăng cường ảnh đã cắt
        BufferedImage enhanced = enhanceImage(cropped);

        // Thay đổi kích thước nếu quá nhỏ
        if (w < 100 || h < 50) {
            enhanced = resizeImage(enhanced, 3.0);
        }

        ByteArrayOutputStream outStream = new ByteArrayOutputStream();
        ImageIO.write(enhanced, "jpg", outStream);
        byte[] croppedBytes = outStream.toByteArray();

        return performOcr(croppedBytes);
    }

    /**
     * Thực hiện OCR trên dữ liệu ảnh
     */
    private String performOcr(byte[] imageBytes) throws InterruptedException {
        try {
        HttpHeaders ocrHeaders = new HttpHeaders();
        ocrHeaders.setContentType(MediaType.APPLICATION_OCTET_STREAM);
        ocrHeaders.set("Ocp-Apim-Subscription-Key", ocrKey);

            HttpEntity<byte[]> ocrEntity = new HttpEntity<>(imageBytes, ocrHeaders);
        ResponseEntity<Void> ocrInit = restTemplate.postForEntity(ocrEndpoint + "/vision/v3.2/read/analyze", ocrEntity, Void.class);
        String operationUrl = ocrInit.getHeaders().getFirst("Operation-Location");
        if (operationUrl == null) return "Lỗi: Không nhận được Operation-Location";

            for (int i = 0; i < 15; i++) { // Tăng thời gian chờ
            Thread.sleep(1000);
            HttpEntity<Void> getEntity = new HttpEntity<>(ocrHeaders);
            ResponseEntity<String> ocrResult = restTemplate.exchange(URI.create(operationUrl), HttpMethod.GET, getEntity, String.class);
            JsonNode resultJson = objectMapper.readTree(ocrResult.getBody());

            if ("succeeded".equals(resultJson.path("status").asText())) {
                    return extractReadingFromOcrResult(resultJson);
                }
            }

            return "OCR timeout sau 15 giây";
        } catch (Exception e) {
            System.err.println("Lỗi trong performOcr: " + e.getMessage());
            return "Lỗi OCR: " + e.getMessage();
        }
    }

    /**
     * Trích xuất chỉ số từ kết quả OCR
     * Lấy chính xác 5 số đầu từ đồng hồ điện (số cuối không tính)
     */
    private String extractReadingFromOcrResult(JsonNode resultJson) {
        try {
                StringBuilder sb = new StringBuilder();
            
            // Trích xuất tất cả text từ kết quả OCR
            for (JsonNode page : resultJson.at("/analyzeResult/readResults")) {
                for (JsonNode line : page.get("lines")) {
                    String text = line.get("text").asText();
                    sb.append(text).append(" ");
                }
            }
            
            String fullText = sb.toString();
            System.out.println("Toàn bộ text OCR: " + fullText);
            
            // Trích xuất tất cả chữ số từ text
            String digitsOnly = fullText.replaceAll("[^0-9]", "");
            System.out.println("Chỉ số đã trích xuất: " + digitsOnly);
            
            // Ưu tiên: Nếu có đủ 6 chữ số, lấy chính xác 5 số đầu
            if (digitsOnly.length() >= 6) {
                String fiveDigits = digitsOnly.substring(0, 5);
                System.out.println("5 số đầu từ 6+ chữ số: " + fiveDigits);
                
                if (isValidMeterReading(fiveDigits)) {
                    return fiveDigits;
                }
            }
            
            // Trường hợp có 5 chữ số
            if (digitsOnly.length() == 5) {
                System.out.println("Phát hiện đúng 5 chữ số: " + digitsOnly);
                if (isValidMeterReading(digitsOnly)) {
                    return digitsOnly;
                }
            }
            
            // Trường hợp có 4 chữ số - có thể là kết quả đã được cắt
            if (digitsOnly.length() == 4) {
                System.out.println("Phát hiện 4 chữ số, có thể đã là kết quả cuối cùng");
                if (isValidMeterReading(digitsOnly)) {
                    return digitsOnly;
                }
            }
            
            // Xử lý các pattern đặc biệt với khoảng trắng
            List<String> patterns = Arrays.asList(
                // Pattern cho trường hợp: 0 3 17 17 (6 số với khoảng trắng)
                "\\b(\\d{1})\\s*(\\d{1})\\s*(\\d{1,2})\\s*(\\d{1,2})\\b",
                // Pattern cho trường hợp: 0 3 17 (3 số với khoảng trắng)
                "\\b(\\d{1})\\s*(\\d{1})\\s*(\\d{1,2})\\b",
                // Pattern cho trường hợp: 0 3 1 7 1 7 (6 số riêng biệt)
                "\\b(\\d{1})\\s*(\\d{1})\\s*(\\d{1})\\s*(\\d{1})\\s*(\\d{1})\\s*(\\d{1})\\b",
                // Pattern cho trường hợp: 0 3 1 7 1 (5 số riêng biệt)
                "\\b(\\d{1})\\s*(\\d{1})\\s*(\\d{1})\\s*(\\d{1})\\s*(\\d{1})\\b",
                // Pattern cho trường hợp: 0 3 1 7 (4 số riêng biệt)
                "\\b(\\d{1})\\s*(\\d{1})\\s*(\\d{1})\\s*(\\d{1})\\b",
                // Pattern cho số liên tục 4-6 chữ số
                "\\b(\\d{4,6})\\b",
                // Pattern cho số với kWh
                "\\b(\\d{4,6})\\s*kWh\\b"
            );
            
            for (String pattern : patterns) {
                java.util.regex.Pattern p = java.util.regex.Pattern.compile(pattern);
                java.util.regex.Matcher m = p.matcher(fullText);
                
                if (m.find()) {
                    String match = "";
                    
                    // Xử lý pattern 6 số với khoảng trắng: 0 3 17 17
                    if (pattern.contains("(\\d{1})\\s*(\\d{1})\\s*(\\d{1,2})\\s*(\\d{1,2})")) {
                        match = m.group(1) + m.group(2) + m.group(3) + m.group(4);
                        System.out.println("Pattern 6 số với khoảng trắng: " + match);
                        if (match.length() >= 6) {
                            match = match.substring(0, 5); // Lấy 5 số đầu
                        }
                    }
                    // Xử lý pattern 3 số với khoảng trắng: 0 3 17
                    else if (pattern.contains("(\\d{1})\\s*(\\d{1})\\s*(\\d{1,2})")) {
                        match = m.group(1) + m.group(2) + m.group(3);
                        System.out.println("Pattern 3 số với khoảng trắng: " + match);
                        // Bổ sung số 0 để có 5 số nếu cần
                        while (match.length() < 5) {
                            match = match + "0";
                        }
                    }
                    // Xử lý pattern 6 số riêng biệt: 0 3 1 7 1 7
                    else if (pattern.contains("(\\d{1})\\s*(\\d{1})\\s*(\\d{1})\\s*(\\d{1})\\s*(\\d{1})\\s*(\\d{1})")) {
                        match = m.group(1) + m.group(2) + m.group(3) + m.group(4) + m.group(5) + m.group(6);
                        System.out.println("Pattern 6 số riêng biệt: " + match);
                        match = match.substring(0, 5); // Lấy 5 số đầu
                    }
                    // Xử lý pattern 5 số riêng biệt: 0 3 1 7 1
                    else if (pattern.contains("(\\d{1})\\s*(\\d{1})\\s*(\\d{1})\\s*(\\d{1})\\s*(\\d{1})")) {
                        match = m.group(1) + m.group(2) + m.group(3) + m.group(4) + m.group(5);
                        System.out.println("Pattern 5 số riêng biệt: " + match);
                    }
                    // Xử lý pattern 4 số riêng biệt: 0 3 1 7
                    else if (pattern.contains("(\\d{1})\\s*(\\d{1})\\s*(\\d{1})\\s*(\\d{1})")) {
                        match = m.group(1) + m.group(2) + m.group(3) + m.group(4);
                        System.out.println("Pattern 4 số riêng biệt: " + match);
                        // Bổ sung số 0 để có 5 số
                        match = match + "0";
                    }
                    // Xử lý pattern số liên tục
                    else {
                        match = m.group(1);
                        System.out.println("Pattern số liên tục: " + match);
                        if (match.length() >= 6) {
                            match = match.substring(0, 5); // Lấy 5 số đầu
                        }
                    }
                    
                    System.out.println("Kết quả sau xử lý pattern: " + match);
                    
                    // Kiểm tra tính hợp lệ của số đã trích xuất
                    if (isValidMeterReading(match)) {
                        return match;
                    }
                }
            }
            
            // Xử lý cuối cùng: nếu có ít hơn 5 chữ số, thử bổ sung
            if (digitsOnly.length() < 5 && digitsOnly.length() > 0) {
                String candidate = digitsOnly;
                while (candidate.length() < 5) {
                    candidate = candidate + "0"; // Thêm số 0 vào cuối
                }
                System.out.println("Bổ sung số 0 để có 5 số: " + candidate);
                if (isValidMeterReading(candidate)) {
                    return candidate;
                }
            }
            
            return "Không tìm thấy chỉ số hợp lệ trong kết quả OCR";
        } catch (Exception e) {
            System.err.println("Lỗi trích xuất chỉ số: " + e.getMessage());
            return "Lỗi xử lý kết quả OCR";
        }
    }

    /**
     * Kiểm tra tính hợp lệ của chỉ số đồng hồ
     * Ưu tiên 5 chữ số, chấp nhận 4-5 chữ số
     */
    private boolean isValidMeterReading(String reading) {
        if (reading == null || reading.trim().isEmpty()) {
            return false;
        }
        
        // Kiểm tra xem có phải là số hợp lệ không (4-5 chữ số)
        if (!reading.matches("\\d{4,5}")) {
            return false;
        }
        
        // Ưu tiên 5 chữ số hơn 4 chữ số
        boolean isFiveDigits = reading.length() == 5;
        
        // Kiểm tra xem có trong khoảng hợp lý không (0-99999)
        try {
            int value = Integer.parseInt(reading);
            boolean isValidRange = value >= 0 && value <= 99999;
            
            // Trả về true nếu hợp lệ, ưu tiên 5 chữ số
            return isValidRange;
        } catch (NumberFormatException e) {
            return false;
        }
    }

    /**
     * Kiểm tra tính hợp lệ của kết quả OCR
     */
    private boolean isValidReading(String result) {
        return result != null && !result.startsWith("File không hợp lệ") && 
               !result.startsWith("Không tìm thấy") && !result.startsWith("Lỗi") && 
               !result.startsWith("Giá trị không hợp lệ") && !result.startsWith("OCR timeout") && 
               !result.startsWith("Invalid") && !result.equals("Không quét được chỉ số điện") &&
               isValidMeterReading(result);
    }

    /**
     * Lấy kết quả tốt nhất từ danh sách các kết quả
     */
    private String getBestResult(List<String> results) {
        for (String result : results) {
            if (isValidReading(result)) {
                return result;
            }
        }
        return null;
    }

    /**
     * Tăng cường chất lượng ảnh
     */
    private BufferedImage enhanceImage(BufferedImage original) {
        BufferedImage enhanced = new BufferedImage(original.getWidth(), original.getHeight(), BufferedImage.TYPE_INT_RGB);
        Graphics2D g2d = enhanced.createGraphics();
        
        // Áp dụng tăng cường
        g2d.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
        g2d.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
        g2d.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        
        g2d.drawImage(original, 0, 0, null);
        g2d.dispose();
        
        return enhanced;
    }

    /**
     * Chuyển ảnh sang grayscale
     */
    private BufferedImage convertToGrayscale(BufferedImage original) {
        BufferedImage grayscale = new BufferedImage(original.getWidth(), original.getHeight(), BufferedImage.TYPE_BYTE_GRAY);
        Graphics2D g2d = grayscale.createGraphics();
        g2d.drawImage(original, 0, 0, null);
        g2d.dispose();
        return grayscale;
    }

    /**
     * Thay đổi kích thước ảnh
     */
    private BufferedImage resizeImage(BufferedImage original, double scale) {
        int newWidth = (int) (original.getWidth() * scale);
        int newHeight = (int) (original.getHeight() * scale);
        
        BufferedImage resized = new BufferedImage(newWidth, newHeight, BufferedImage.TYPE_INT_RGB);
        Graphics2D g2d = resized.createGraphics();
        g2d.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
        g2d.drawImage(original, 0, 0, newWidth, newHeight, null);
        g2d.dispose();
        
        return resized;
    }

    /**
     * Lưu chỉ số điện vào database
     */
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