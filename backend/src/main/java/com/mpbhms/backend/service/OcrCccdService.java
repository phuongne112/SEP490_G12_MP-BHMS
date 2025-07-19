package com.mpbhms.backend.service;

import com.azure.ai.formrecognizer.documentanalysis.DocumentAnalysisClient;
import com.azure.ai.formrecognizer.documentanalysis.DocumentAnalysisClientBuilder;
import com.azure.ai.formrecognizer.documentanalysis.models.AnalyzeDocumentOptions;
import com.azure.ai.formrecognizer.documentanalysis.models.AnalyzeResult;
import com.azure.core.credential.AzureKeyCredential;
import com.azure.core.util.BinaryData;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.*;
import java.util.regex.*;

@Service
public class OcrCccdService {
    @Value("${azure.cccd.endpoint}")
    private String cccdEndpoint;

    @Value("${azure.cccd.key}")
    private String cccdKey;

    // Hàm OCR 1 mặt CCCD, trả về list dòng text
    public List<String> ocrImage(MultipartFile file) throws Exception {
        DocumentAnalysisClient client = new DocumentAnalysisClientBuilder()
                .credential(new AzureKeyCredential(cccdKey))
                .endpoint(cccdEndpoint)
                .buildClient();

        AnalyzeResult result = client.beginAnalyzeDocument(
            "prebuilt-read",
            BinaryData.fromStream(file.getInputStream(), file.getSize())
        ).getFinalResult();

        List<String> lines = new ArrayList<>();
        result.getPages().forEach(page -> page.getLines().forEach(line -> lines.add(line.getContent())));
        return lines;
    }

    // Hàm parse thông tin từ list dòng text
    public Map<String, Object> parseCccdInfo(List<String> lines) {
        Map<String, Object> info = new HashMap<>();
        for (int i = 0; i < lines.size(); i++) {
            String line = lines.get(i);
            if (line.matches(".*Số.*No.*")) {
                String next = (i + 1 < lines.size()) ? lines.get(i + 1) : "";
                String id = next.replaceAll("[^0-9]", "");
                if (id.length() < 8) id = line.replaceAll("[^0-9]", "");
                info.put("nationalID", id);
            }
            if (line.matches(".*Họ và tên.*")) {
                String next = (i + 1 < lines.size()) ? lines.get(i + 1) : "";
                info.put("fullName", next.trim());
            }
            if (line.matches(".*Ngày sinh.*")) {
                String next = (i + 1 < lines.size()) ? lines.get(i + 1) : "";
                Matcher m = Pattern.compile("\\d{2}/\\d{2}/\\d{4}").matcher(next + " " + line);
                if (m.find()) info.put("birthDate", m.group());
            }
            if (line.matches(".*Giới tính.*")) {
                String next = (i + 1 < lines.size()) ? lines.get(i + 1) : "";
                if (next.toLowerCase().contains("nam")) info.put("gender", "Nam");
                else if (next.toLowerCase().contains("nữ")) info.put("gender", "Nữ");
            }
            if (line.matches(".*Quê quán.*")) {
                String next = (i + 1 < lines.size()) ? lines.get(i + 1) : "";
                info.put("birthPlace", next.trim());
            }
            if (line.matches(".*Nơi thường trú.*")) {
                String next = (i + 1 < lines.size()) ? lines.get(i + 1) : "";
                info.put("permanentAddress", next.trim());
            }
            if (line.matches(".*giá trị đến.*")) {
                String next = (i + 1 < lines.size()) ? lines.get(i + 1) : "";
                Matcher m = Pattern.compile("\\d{2}/\\d{2}/\\d{4}").matcher(next + " " + line);
                if (m.find()) info.put("expiryDate", m.group());
            }
        }
        return info;
    }

    // Hàm tổng hợp: nhận 2 mặt, trả về map thông tin
    public Map<String, Object> ocrCccd(MultipartFile front, MultipartFile back) throws Exception {
        List<String> linesFront = ocrImage(front);
        // Nếu cần, có thể OCR mặt sau và parse thêm barcode, v.v.
        Map<String, Object> info = parseCccdInfo(linesFront);
        return info;
    }
} 