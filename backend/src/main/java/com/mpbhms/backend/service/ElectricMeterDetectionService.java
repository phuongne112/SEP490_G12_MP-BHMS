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
import java.io.IOException;
import java.math.BigDecimal;
import java.net.URI;
import java.time.Instant;
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

    @Autowired
    private ServiceRepository serviceRepository;

    @Autowired
    private RoomRepository roomRepository;

    @Autowired
    private ServiceReadingRepository serviceReadingRepository;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    public String detectAndReadFromFile(MultipartFile file, Long roomId) throws IOException, InterruptedException {
        String result = detectAndReadFromFile(file);
        if (result.matches("\\d{5}(\\.\\d)?")) {
            saveElectricReading(result, roomId);
        }
        return result;
    }

    public String detectAndReadFromFile(MultipartFile file) throws IOException, InterruptedException {
        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            return "Invalid file: only image files (jpg, png, bmp, gif) are accepted";
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

        if (bestBox == null) return "No high-confidence reading area found";

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
        if (operationUrl == null) return "Error: Operation-Location not received";

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

                if (resultDigits.length() == 5) return resultDigits;
                if (resultDigits.length() == 6) return resultDigits.substring(0, 5) + "." + resultDigits.charAt(5);
                return "Invalid value: " + resultDigits;
            }
        }

        return "OCR timeout after 10 seconds";
    }

    public void saveElectricReading(String resultValue, Long roomId) {
        CustomService electricityCustomService = serviceRepository.findByServiceType(ServiceType.ELECTRICITY);
        if (electricityCustomService == null) throw new RuntimeException("Không tìm thấy service ELECTRICITY");

        Room room = roomRepository.findById(roomId).orElseThrow(() -> new RuntimeException("Không tìm thấy phòng"));

        Optional<ServiceReading> latestOpt = serviceReadingRepository.findTopByRoomAndServiceOrderByCreatedDateDesc(room, electricityCustomService);
        if (latestOpt.isPresent()) {
            ServiceReading latest = latestOpt.get();
            latest.setOldReading(latest.getNewReading());
            latest.setNewReading(new BigDecimal(resultValue));
            latest.setUpdatedDate(Instant.now());
            latest.setUpdatedBy("OCR");
            serviceReadingRepository.save(latest);
        } else {
            ServiceReading reading = new ServiceReading();
            reading.setRoom(room);
            reading.setService(electricityCustomService);
            reading.setOldReading(BigDecimal.ZERO);
            reading.setNewReading(new BigDecimal(resultValue));
            reading.setCreatedDate(Instant.now());
            reading.setCreatedBy("OCR");
            serviceReadingRepository.save(reading);
        }
    }
}