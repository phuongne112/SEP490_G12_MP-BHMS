package com.mpbhms.backend.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.*;

@Service
public class ElectricOcrService {

    @Value("${azure.ocr.endpoint}")
    private String endpoint;

    @Value("${azure.ocr.key}")
    private String apiKey;

    private static final String OCR_READ_URL = "/vision/v3.2/read/analyze";

    public String extractTextFromImage(MultipartFile file) throws IOException, InterruptedException {
        String url = endpoint + OCR_READ_URL;

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_OCTET_STREAM);
        headers.set("Ocp-Apim-Subscription-Key", apiKey);

        HttpEntity<byte[]> entity = new HttpEntity<>(file.getBytes(), headers);
        RestTemplate restTemplate = new RestTemplate();

        // 1. Gửi request đọc ảnh
        ResponseEntity<Void> response = restTemplate.exchange(url, HttpMethod.POST, entity, Void.class);
        String operationLocation = response.getHeaders().getFirst("Operation-Location");

        // 2. Đợi OCR xử lý xong (polling)
        String resultUrl = operationLocation;
        Map result;
        int retry = 0;
        do {
            Thread.sleep(1000);
            ResponseEntity<Map> resultResponse = restTemplate.exchange(resultUrl, HttpMethod.GET, new HttpEntity<>(headers), Map.class);
            result = resultResponse.getBody();
            retry++;
        } while (result != null &&
                result.get("status") != null &&
                result.get("status").equals("running") &&
                retry < 10);

        // 3. Trích text (SỬA ĐOẠN NÀY)
        StringBuilder extractedText = new StringBuilder();
        Map<String, Object> analyzeResult = (Map<String, Object>) result.get("analyzeResult");
        List<Map<String, Object>> readResults = (List<Map<String, Object>>) analyzeResult.get("readResults");

        for (Map<String, Object> page : readResults) {
            List<Map<String, Object>> lines = (List<Map<String, Object>>) page.get("lines");
            for (Map<String, Object> line : lines) {
                extractedText.append(line.get("text")).append(" ");
            }
        }

        return extractedText.toString().trim();
    }
}
