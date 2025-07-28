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

    // Hàm parse thông tin từ list dòng text (mặt trước)
    public Map<String, Object> parseCccdFrontInfo(List<String> lines) {
        Map<String, Object> info = new HashMap<>();
        
        // Debug: In ra tất cả các dòng để kiểm tra
        System.out.println("=== DEBUG: Tất cả các dòng OCR từ mặt trước CCCD ===");
        for (int i = 0; i < lines.size(); i++) {
            System.out.println("Line " + i + ": " + lines.get(i));
        }
        System.out.println("=== END DEBUG ===");
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
            
            // Tìm địa chỉ thường trú một cách chính xác hơn
            if (line.matches(".*Nơi thường trú.*")) {
                System.out.println("=== DEBUG: Tìm thấy 'Nơi thường trú' trong dòng: " + line + " ===");
                StringBuilder address = new StringBuilder();
                
                // Tìm địa chỉ trong dòng hiện tại sau từ khóa
                String[] parts = line.split(":");
                if (parts.length > 1) {
                    String partAfterColon = parts[1].trim();
                    if (!partAfterColon.isEmpty()) {
                        address.append(partAfterColon);
                    }
                }
                
                // Thêm tất cả các dòng tiếp theo cho đến khi gặp dòng không phải địa chỉ
                int j = 1;
                while (i + j < lines.size()) {
                    String nextLine = lines.get(i + j).trim();
                    
                    // Kiểm tra xem dòng này có phải là địa chỉ không - logic đơn giản hơn
                    boolean isAddressLine = !nextLine.isEmpty() && 
                        !nextLine.matches(".*Có giá trị đến.*") &&
                        !nextLine.matches(".*Date of expiry.*") &&
                        !nextLine.matches(".*giá trị đến.*") &&
                        !nextLine.matches(".*\\d{2}/\\d{2}/\\d{4}.*") &&
                        !nextLine.matches(".*Ngày.*tháng.*năm.*") &&
                        !nextLine.matches(".*Date.*month.*year.*") &&
                        !nextLine.matches(".*Họ và tên.*") &&
                        !nextLine.matches(".*Full name.*") &&
                        !nextLine.matches(".*Số.*No.*") &&
                        !nextLine.matches(".*Ngày sinh.*") &&
                        !nextLine.matches(".*Date of birth.*") &&
                        !nextLine.matches(".*Giới tính.*") &&
                        !nextLine.matches(".*Sex.*") &&
                        !nextLine.matches(".*Quê quán.*") &&
                        !nextLine.matches(".*Place of birth.*") &&
                        !nextLine.matches(".*Quốc tịch.*") &&
                        !nextLine.matches(".*Nationality.*") &&
                        nextLine.length() > 2;
                    
                    System.out.println("=== DEBUG: Kiểm tra dòng " + j + ": '" + nextLine + "' - isAddressLine: " + isAddressLine + " ===");
                    
                    if (isAddressLine) {
                        if (address.length() > 0) {
                            address.append(", ");
                        }
                        address.append(nextLine);
                        System.out.println("=== DEBUG: Thêm dòng địa chỉ " + j + ": " + nextLine + " ===");
                        j++;
                    } else {
                        // Thay vì dừng ngay, tiếp tục tìm kiếm các dòng địa chỉ phía sau
                        System.out.println("=== DEBUG: Bỏ qua dòng " + j + " (không phải địa chỉ): " + nextLine + " ===");
                        j++;
                        // Tiếp tục tìm kiếm thêm 3 dòng nữa để tìm địa chỉ
                        int continueSearch = 0;
                        while (i + j < lines.size() && continueSearch < 3) {
                            String continueLine = lines.get(i + j).trim();
                            boolean isContinueAddressLine = !continueLine.isEmpty() && 
                                !continueLine.matches(".*Có giá trị đến.*") &&
                                !continueLine.matches(".*Date of expiry.*") &&
                                !continueLine.matches(".*giá trị đến.*") &&
                                !continueLine.matches(".*\\d{2}/\\d{2}/\\d{4}.*") &&
                                !continueLine.matches(".*Họ và tên.*") &&
                                !continueLine.matches(".*Full name.*") &&
                                !continueLine.matches(".*Số.*No.*") &&
                                !continueLine.matches(".*Ngày sinh.*") &&
                                !continueLine.matches(".*Date of birth.*") &&
                                !continueLine.matches(".*Giới tính.*") &&
                                !continueLine.matches(".*Sex.*") &&
                                !continueLine.matches(".*Quê quán.*") &&
                                !continueLine.matches(".*Place of birth.*") &&
                                !continueLine.matches(".*Quốc tịch.*") &&
                                !continueLine.matches(".*Nationality.*") &&
                                continueLine.length() > 2;
                            
                            System.out.println("=== DEBUG: Tiếp tục tìm kiếm dòng " + j + ": '" + continueLine + "' - isAddressLine: " + isContinueAddressLine + " ===");
                            
                            if (isContinueAddressLine) {
                                if (address.length() > 0) {
                                    address.append(", ");
                                }
                                address.append(continueLine);
                                System.out.println("=== DEBUG: Thêm dòng địa chỉ tiếp theo " + j + ": " + continueLine + " ===");
                                j++;
                                continueSearch = 0; // Reset counter khi tìm thấy địa chỉ
                            } else {
                                j++;
                                continueSearch++;
                            }
                        }
                        break;
                    }
                }
                
                if (address.length() > 0) {
                    String finalAddress = address.toString().trim();
                    info.put("permanentAddress", finalAddress);
                    System.out.println("=== DEBUG: Đã trích xuất địa chỉ thường trú chính xác: " + finalAddress + " ===");
                    System.out.println("=== DEBUG: Tổng số dòng địa chỉ: " + (j - 1) + " ===");
                } else {
                    System.out.println("=== DEBUG: Không tìm thấy địa chỉ thường trú ===");
                }
            }
            
            // Thêm logic dự phòng: tìm địa chỉ thường trú bằng cách khác
            if (line.matches(".*Place of residence.*")) {
                System.out.println("=== DEBUG: Tìm thấy 'Place of residence' trong dòng: " + line + " ===");
                StringBuilder address = new StringBuilder();
                
                // Tìm địa chỉ trong dòng hiện tại sau từ khóa
                String[] parts = line.split(":");
                if (parts.length > 1) {
                    String partAfterColon = parts[1].trim();
                    if (!partAfterColon.isEmpty()) {
                        address.append(partAfterColon);
                    }
                }
                
                // Thêm tất cả các dòng tiếp theo cho đến khi gặp dòng không phải địa chỉ
                int j = 1;
                while (i + j < lines.size()) {
                    String nextLine = lines.get(i + j).trim();
                    
                    // Logic đơn giản hơn cho địa chỉ
                    boolean isAddressLine = !nextLine.isEmpty() && 
                        !nextLine.matches(".*Có giá trị đến.*") &&
                        !nextLine.matches(".*Date of expiry.*") &&
                        !nextLine.matches(".*giá trị đến.*") &&
                        !nextLine.matches(".*\\d{2}/\\d{2}/\\d{4}.*") &&
                        !nextLine.matches(".*Họ và tên.*") &&
                        !nextLine.matches(".*Full name.*") &&
                        !nextLine.matches(".*Số.*No.*") &&
                        !nextLine.matches(".*Ngày sinh.*") &&
                        !nextLine.matches(".*Date of birth.*") &&
                        !nextLine.matches(".*Giới tính.*") &&
                        !nextLine.matches(".*Sex.*") &&
                        !nextLine.matches(".*Quê quán.*") &&
                        !nextLine.matches(".*Place of birth.*") &&
                        !nextLine.matches(".*Quốc tịch.*") &&
                        !nextLine.matches(".*Nationality.*") &&
                        nextLine.length() > 2;
                    
                    System.out.println("=== DEBUG: Kiểm tra dòng " + j + ": '" + nextLine + "' - isAddressLine: " + isAddressLine + " ===");
                    
                    if (isAddressLine) {
                        if (address.length() > 0) {
                            address.append(", ");
                        }
                        address.append(nextLine);
                        System.out.println("=== DEBUG: Thêm dòng địa chỉ " + j + ": " + nextLine + " ===");
                        j++;
                    } else {
                        // Thay vì dừng ngay, tiếp tục tìm kiếm các dòng địa chỉ phía sau
                        System.out.println("=== DEBUG: Bỏ qua dòng " + j + " (không phải địa chỉ): " + nextLine + " ===");
                        j++;
                        // Tiếp tục tìm kiếm thêm 3 dòng nữa để tìm địa chỉ
                        int continueSearch = 0;
                        while (i + j < lines.size() && continueSearch < 3) {
                            String continueLine = lines.get(i + j).trim();
                            boolean isContinueAddressLine = !continueLine.isEmpty() && 
                                !continueLine.matches(".*Có giá trị đến.*") &&
                                !continueLine.matches(".*Date of expiry.*") &&
                                !continueLine.matches(".*giá trị đến.*") &&
                                !continueLine.matches(".*\\d{2}/\\d{2}/\\d{4}.*") &&
                                !continueLine.matches(".*Họ và tên.*") &&
                                !continueLine.matches(".*Full name.*") &&
                                !nextLine.matches(".*Số.*No.*") &&
                                !continueLine.matches(".*Ngày sinh.*") &&
                                !continueLine.matches(".*Date of birth.*") &&
                                !continueLine.matches(".*Giới tính.*") &&
                                !continueLine.matches(".*Sex.*") &&
                                !continueLine.matches(".*Quê quán.*") &&
                                !continueLine.matches(".*Place of birth.*") &&
                                !continueLine.matches(".*Quốc tịch.*") &&
                                !continueLine.matches(".*Nationality.*") &&
                                continueLine.length() > 2;
                            
                            System.out.println("=== DEBUG: Tiếp tục tìm kiếm dòng " + j + ": '" + continueLine + "' - isAddressLine: " + isContinueAddressLine + " ===");
                            
                            if (isContinueAddressLine) {
                                if (address.length() > 0) {
                                    address.append(", ");
                                }
                                address.append(continueLine);
                                System.out.println("=== DEBUG: Thêm dòng địa chỉ tiếp theo " + j + ": " + continueLine + " ===");
                                j++;
                                continueSearch = 0; // Reset counter khi tìm thấy địa chỉ
                            } else {
                                j++;
                                continueSearch++;
                            }
                        }
                        break;
                    }
                }
                
                if (address.length() > 0) {
                    String finalAddress = address.toString().trim();
                    info.put("permanentAddress", finalAddress);
                    System.out.println("=== DEBUG: Đã trích xuất địa chỉ thường trú từ Place of residence: " + finalAddress + " ===");
                    System.out.println("=== DEBUG: Tổng số dòng địa chỉ: " + (j - 1) + " ===");
                }
            }

            if (line.matches(".*giá trị đến.*")) {
                String next = (i + 1 < lines.size()) ? lines.get(i + 1) : "";
                Matcher m = Pattern.compile("\\d{2}/\\d{2}/\\d{4}").matcher(next + " " + line);
                if (m.find()) info.put("expiryDate", m.group());
            }
        }
        return info;
    }

    // Hàm parse thông tin từ mặt sau CCCD (ngày cấp và tên từ MRZ)
    public Map<String, Object> parseCccdBackInfo(List<String> lines) {
        Map<String, Object> info = new HashMap<>();
        
        // Debug: In ra tất cả các dòng để kiểm tra
        System.out.println("=== DEBUG: Tất cả các dòng OCR từ mặt sau CCCD ===");
        for (int i = 0; i < lines.size(); i++) {
            System.out.println("Line " + i + ": " + lines.get(i));
        }
        System.out.println("=== END DEBUG ===");
        
        for (int i = 0; i < lines.size(); i++) {
            String line = lines.get(i);
            
            // Tìm ngày cấp từ mặt sau CCCD
            if (line.matches(".*Ngày.*tháng.*năm.*") || line.matches(".*Date.*month.*year.*")) {
                String next = (i + 1 < lines.size()) ? lines.get(i + 1) : "";
                Matcher m = Pattern.compile("\\d{2}/\\d{2}/\\d{4}").matcher(next + " " + line);
                if (m.find()) {
                    info.put("issueDate", m.group());
                    break;
                }
            }
            // Tìm ngày cấp từ các pattern khác
            if (line.matches(".*cấp.*") || line.matches(".*issued.*")) {
                String next = (i + 1 < lines.size()) ? lines.get(i + 1) : "";
                Matcher m = Pattern.compile("\\d{2}/\\d{2}/\\d{4}").matcher(next + " " + line);
                if (m.find()) {
                    info.put("issueDate", m.group());
                    break;
                }
            }
            
            // Tìm tên từ MRZ (Machine Readable Zone)
            if (line.matches(".*[A-Z]+<<[A-Z]+.*")) {
                System.out.println("=== DEBUG: Tìm thấy MRZ line: " + line + " ===");
                // Tách tên từ MRZ format: TRAN<<VAN<HOANG<LONG
                String[] parts = line.split("<<");
                if (parts.length >= 2) {
                    String lastName = parts[0].trim();
                    String firstName = parts[1].replaceAll("<", " ").trim();
                    String fullNameMRZ = (lastName + " " + firstName).trim();
                    info.put("fullNameMRZ", fullNameMRZ);
                    System.out.println("=== DEBUG: Trích xuất tên từ MRZ: " + fullNameMRZ + " ===");
                }
            }
        }
        return info;
    }

    // Hàm tổng hợp: nhận 2 mặt, trả về map thông tin
    public Map<String, Object> ocrCccd(MultipartFile front, MultipartFile back) throws Exception {
        List<String> linesFront = ocrImage(front);
        List<String> linesBack = ocrImage(back);
        
        // Kiểm tra các trường hợp upload
        boolean isFront1 = isFrontSide(linesFront);
        boolean isFront2 = isFrontSide(linesBack);
        boolean isBack1 = isBackSide(linesFront);
        boolean isBack2 = isBackSide(linesBack);
        
        System.out.println("=== DEBUG: Phân tích loại ảnh ===");
        System.out.println("Ảnh 1 (front param): isFront=" + isFront1 + ", isBack=" + isBack1);
        System.out.println("Ảnh 2 (back param): isFront=" + isFront2 + ", isBack=" + isBack2);
        
        // Trường hợp 1: Cả 2 đều là mặt trước
        if (isFront1 && isFront2) {
            System.out.println("=== LỖI: Cả 2 ảnh đều là mặt trước CCCD ===");
            System.out.println("Vui lòng upload 1 ảnh mặt trước và 1 ảnh mặt sau CCCD");
            throw new RuntimeException("Cả 2 ảnh đều là mặt trước CCCD. Vui lòng upload 1 ảnh mặt trước và 1 ảnh mặt sau để xác minh tính nhất quán của CCCD.");
        }
        
        // Trường hợp 2: Cả 2 đều là mặt sau
        if (isBack1 && isBack2) {
            System.out.println("=== LỖI: Cả 2 ảnh đều là mặt sau CCCD ===");
            System.out.println("Vui lòng upload 1 ảnh mặt trước và 1 ảnh mặt sau CCCD");
            throw new RuntimeException("Cả 2 ảnh đều là mặt sau CCCD. Vui lòng upload 1 ảnh mặt trước và 1 ảnh mặt sau để xác minh tính nhất quán của CCCD.");
        }
        
        Map<String, Object> info;
        
        // Trường hợp 3: Upload nhầm vị trí (mặt sau vào ô trước, mặt trước vào ô sau)
        if (isBack1 && isFront2) {
            System.out.println("=== LỖI: Upload nhầm vị trí ===");
            System.out.println("Ảnh 1 (front param) thực tế là mặt sau");
            System.out.println("Ảnh 2 (back param) thực tế là mặt trước");
            System.out.println("Vui lòng upload đúng vị trí: ảnh mặt trước vào ô 'Mặt trước', ảnh mặt sau vào ô 'Mặt sau'");
            throw new RuntimeException("Upload nhầm vị trí. Vui lòng upload đúng vị trí: ảnh mặt trước vào ô 'Mặt trước', ảnh mặt sau vào ô 'Mặt sau'.");
        }
        
        // Trường hợp 4: Upload đúng vị trí (mặt trước vào ô trước, mặt sau vào ô sau)
        if (isFront1 && isBack2) {
            System.out.println("=== XỬ LÝ: Upload đúng vị trí ===");
            
            // Parse thông tin từ mặt trước
            info = parseCccdFrontInfo(linesFront);
            
            // Parse thông tin từ mặt sau (ngày cấp)
            Map<String, Object> backInfo = parseCccdBackInfo(linesBack);
            
            // Kết hợp thông tin từ cả 2 mặt
            info.putAll(backInfo);
        } else {
            // Trường hợp 5: Không xác định được loại ảnh
            System.out.println("=== LỖI: Không xác định được loại ảnh ===");
            System.out.println("Ảnh 1 (front param): isFront=" + isFront1 + ", isBack=" + isBack1);
            System.out.println("Ảnh 2 (back param): isFront=" + isFront2 + ", isBack=" + isBack2);
            throw new RuntimeException("Không xác định được loại ảnh. Vui lòng upload ảnh CCCD rõ ràng.");
        }
        
        // Xác minh tính nhất quán của CCCD bằng cách so sánh tên
        String frontName = (String) info.get("fullName");
        String backName = (String) info.get("fullNameMRZ");
        
        if (frontName != null && backName != null) {
            boolean namesMatch = compareNames(frontName, backName);
            if (!namesMatch) {
                System.out.println("=== LỖI: Tên không khớp giữa 2 mặt CCCD ===");
                System.out.println("Mặt trước: " + frontName);
                System.out.println("Mặt sau: " + backName);
                throw new RuntimeException("Tên không khớp giữa 2 mặt CCCD. Có thể đây không phải là cùng một CCCD.");
            } else {
                System.out.println("=== THÀNH CÔNG: Tên khớp giữa 2 mặt CCCD ===");
            }
        } else {
            System.out.println("=== CẢNH BÁO: Không thể xác minh tên (thiếu thông tin) ===");
            if (frontName == null) System.out.println("Không tìm thấy tên ở mặt trước");
            if (backName == null) System.out.println("Không tìm thấy tên ở mặt sau");
        }
        
        // Debug: In ra kết quả cuối cùng
        System.out.println("=== DEBUG: Kết quả OCR cuối cùng ===");
        for (Map.Entry<String, Object> entry : info.entrySet()) {
            System.out.println(entry.getKey() + ": " + entry.getValue());
        }
        System.out.println("=== END DEBUG ===");
        
        return info;
    }
    
    // Hàm chuẩn hóa tên để so sánh
    private String normalizeName(String name) {
        if (name == null) return "";
        
        // Chuyển về chữ hoa
        String normalized = name.toUpperCase();
        
        // Loại bỏ dấu tiếng Việt
        normalized = normalized.replaceAll("[ÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴ]", "A");
        normalized = normalized.replaceAll("[ÈÉẸẺẼÊỀẾỆỂỄ]", "E");
        normalized = normalized.replaceAll("[ÌÍỊỈĨ]", "I");
        normalized = normalized.replaceAll("[ÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠ]", "O");
        normalized = normalized.replaceAll("[ÙÚỤỦŨƯỪỨỰỬỮ]", "U");
        normalized = normalized.replaceAll("[ỲÝỴỶỸ]", "Y");
        normalized = normalized.replaceAll("[Đ]", "D");
        
        // Loại bỏ khoảng trắng thừa
        normalized = normalized.replaceAll("\\s+", " ").trim();
        
        return normalized;
    }
    
    // Hàm so sánh tên từ 2 mặt CCCD
    private boolean compareNames(String frontName, String backName) {
        if (frontName == null || backName == null) return false;
        
        String normalizedFront = normalizeName(frontName);
        String normalizedBack = normalizeName(backName);
        
        System.out.println("=== DEBUG: So sánh tên ===");
        System.out.println("Tên mặt trước (gốc): " + frontName);
        System.out.println("Tên mặt sau (gốc): " + backName);
        System.out.println("Tên mặt trước (chuẩn hóa): " + normalizedFront);
        System.out.println("Tên mặt sau (chuẩn hóa): " + normalizedBack);
        
        boolean isMatch = normalizedFront.equals(normalizedBack);
        System.out.println("Kết quả so sánh: " + (isMatch ? "KHỚP" : "KHÔNG KHỚP"));
        
        return isMatch;
    }
    
    // Hàm kiểm tra xem có phải mặt trước CCCD không
    private boolean isFrontSide(List<String> lines) {
        for (String line : lines) {
            // Kiểm tra các từ khóa đặc trưng của mặt trước CCCD
            if (line.contains("CĂN CƯỚC CÔNG DÂN") || 
                line.contains("CITIZEN IDENTITY CARD") ||
                line.contains("Họ và tên") ||
                line.contains("Full name") ||
                line.contains("Ngày sinh") ||
                line.contains("Date of birth")) {
                return true;
            }
        }
        return false;
    }
    
    // Hàm kiểm tra xem có phải mặt sau CCCD không
    private boolean isBackSide(List<String> lines) {
        for (String line : lines) {
            // Kiểm tra các từ khóa đặc trưng của mặt sau CCCD
            if (line.contains("MACHINE READABLE") ||
                line.contains("IDVNM") ||
                line.matches(".*[A-Z]+<<[A-Z]+.*") ||
                line.contains("Ngày tháng năm") ||
                line.contains("Date month year")) {
                return true;
            }
        }
        return false;
    }
    
    // Hàm trích xuất MRZ từ mặt trước CCCD (nếu có)
    private Map<String, Object> extractMRZFromFrontImage(List<String> lines) {
        Map<String, Object> info = new HashMap<>();
        
        for (int i = 0; i < lines.size(); i++) {
            String line = lines.get(i);
            
            // Tìm tên từ MRZ (Machine Readable Zone) - thường ở cuối mặt trước
            if (line.matches(".*[A-Z]+<<[A-Z]+.*")) {
                System.out.println("=== DEBUG: Tìm thấy MRZ line trong mặt trước: " + line + " ===");
                // Tách tên từ MRZ format: TRAN<<VAN<HOANG<LONG
                String[] parts = line.split("<<");
                if (parts.length >= 2) {
                    String lastName = parts[0].trim();
                    String firstName = parts[1].replaceAll("<", " ").trim();
                    String fullNameMRZ = (lastName + " " + firstName).trim();
                    info.put("fullNameMRZ", fullNameMRZ);
                    System.out.println("=== DEBUG: Trích xuất tên từ MRZ mặt trước: " + fullNameMRZ + " ===");
                }
            }
            
            // Tìm ngày cấp từ mặt trước (nếu có)
            if (line.matches(".*Ngày.*tháng.*năm.*") || line.matches(".*Date.*month.*year.*")) {
                String next = (i + 1 < lines.size()) ? lines.get(i + 1) : "";
                Matcher m = Pattern.compile("\\d{2}/\\d{2}/\\d{4}").matcher(next + " " + line);
                if (m.find()) {
                    info.put("issueDate", m.group());
                    System.out.println("=== DEBUG: Tìm thấy ngày cấp trong mặt trước: " + m.group() + " ===");
                }
            }
        }
        
        return info;
    }
} 