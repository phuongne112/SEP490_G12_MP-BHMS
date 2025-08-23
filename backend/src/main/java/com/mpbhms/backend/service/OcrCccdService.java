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
        byte[] fileBytes = file.getBytes();
        AnalyzeResult result = client.beginAnalyzeDocument(
            "prebuilt-read",
            BinaryData.fromBytes(fileBytes)
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
            
            // Tìm số CCCD
            if (line.matches(".*Số.*No.*")) {
                String next = (i + 1 < lines.size()) ? lines.get(i + 1) : "";
                String id = next.replaceAll("[^0-9]", "");
                if (id.length() < 8) id = line.replaceAll("[^0-9]", "");
                info.put("nationalID", id);
            }
            
            // Tìm tên
            if (line.matches(".*Họ và tên.*")) {
                String next = (i + 1 < lines.size()) ? lines.get(i + 1) : "";
                info.put("fullName", next.trim());
            }
            
            // Tìm ngày sinh
            if (line.matches(".*Ngày sinh.*")) {
                String next = (i + 1 < lines.size()) ? lines.get(i + 1) : "";
                Matcher m = Pattern.compile("\\d{2}/\\d{2}/\\d{4}").matcher(next + " " + line);
                if (m.find()) info.put("birthDate", m.group());
            }
            
            // Cải thiện logic tìm giới tính
            if (line.matches(".*Giới tính.*") || line.matches(".*Sex.*") ||
                line.matches(".*Nam.*") || line.matches(".*Nữ.*") ||
                line.matches(".*Male.*") || line.matches(".*Female.*")) {
                
                String gender = line.toLowerCase().trim();
                if (gender.contains("nam") || gender.contains("male")) {
                    info.put("gender", "Nam");
                } else if (gender.contains("nữ") || gender.contains("nu") || gender.contains("female")) {
                    info.put("gender", "Nữ");
                } else {
                    // Tìm ở dòng tiếp theo
                    String next = (i + 1 < lines.size()) ? lines.get(i + 1) : "";
                    String nextGender = next.toLowerCase().trim();
                    if (nextGender.contains("nam") || nextGender.contains("male")) {
                        info.put("gender", "Nam");
                    } else if (nextGender.contains("nữ") || nextGender.contains("nu") || nextGender.contains("female")) {
                        info.put("gender", "Nữ");
                    }
                }
            }
            
            // Tìm nơi sinh
            if (line.matches(".*Nơi sinh.*") || line.matches(".*Place of birth.*") ||
                line.matches(".*Quê quán.*") || line.matches(".*Native place.*")) {
                
                System.out.println("=== DEBUG: Tìm thấy dòng nơi sinh: " + line + " ===");
                StringBuilder birthPlace = new StringBuilder();
                
                // Tìm nơi sinh trong dòng hiện tại sau từ khóa
                String[] parts = line.split(":");
                if (parts.length > 1) {
                    String partAfterColon = parts[1].trim();
                    if (!partAfterColon.isEmpty()) {
                        birthPlace.append(partAfterColon);
                    }
                }
                
                // Thêm dòng tiếp theo nếu cần thiết
                if (i + 1 < lines.size()) {
                    String nextLine = lines.get(i + 1).trim();
                    // Kiểm tra xem dòng tiếp theo có phải là nơi sinh không
                    boolean isBirthPlaceLine = !nextLine.isEmpty() && 
                        !nextLine.matches(".*\\d{2}/\\d{2}/\\d{4}.*") && // Không phải ngày
                        !nextLine.matches(".*Ngày.*tháng.*năm.*") &&
                        !nextLine.matches(".*Date.*month.*year.*") &&
                        !nextLine.matches(".*Họ và tên.*") &&
                        !nextLine.matches(".*Full name.*") &&
                        !nextLine.matches(".*Số.*No.*") &&
                        !nextLine.matches(".*Giới tính.*") &&
                        !nextLine.matches(".*Sex.*") &&
                        !nextLine.matches(".*Địa chỉ thường trú.*") &&
                        !nextLine.matches(".*Permanent address.*") &&
                        !nextLine.matches(".*[A-Z]+<<[A-Z]+.*") && // Không phải MRZ
                        nextLine.length() > 2;
                    
                    if (isBirthPlaceLine) {
                        if (birthPlace.length() > 0) {
                            birthPlace.append(", ");
                        }
                        birthPlace.append(nextLine);
                        System.out.println("=== DEBUG: Thêm dòng nơi sinh: " + nextLine + " ===");
                    }
                }
                
                if (birthPlace.length() > 0) {
                    String finalBirthPlace = birthPlace.toString().trim();
                    info.put("birthPlace", finalBirthPlace);
                    System.out.println("=== DEBUG: Đã trích xuất nơi sinh: " + finalBirthPlace + " ===");
                } else {
                    System.out.println("=== DEBUG: Không tìm thấy nơi sinh ===");
                }
            }
            
            // Tìm địa chỉ thường trú - Logic mới đơn giản và hiệu quả hơn
            if (line.matches(".*Địa chỉ thường trú.*") || line.matches(".*Permanent address.*") ||
                line.matches(".*Nơi thường trú.*") || line.matches(".*Place of residence.*")) {
                
                System.out.println("=== DEBUG: Tìm thấy dòng địa chỉ thường trú: " + line + " ===");
                StringBuilder address = new StringBuilder();
                
                // Tìm địa chỉ trong dòng hiện tại sau từ khóa
                String[] parts = line.split(":");
                if (parts.length > 1) {
                    String partAfterColon = parts[1].trim();
                    if (!partAfterColon.isEmpty()) {
                        address.append(partAfterColon);
                    }
                }
                
                // Logic mới: Đọc tất cả các dòng tiếp theo cho đến khi gặp dòng rõ ràng không phải địa chỉ
                int j = 1;
                while (i + j < lines.size()) {
                    String nextLine = lines.get(i + j).trim();
                    
                    // Chỉ dừng khi gặp các dòng rõ ràng KHÔNG phải địa chỉ
                    boolean isDefinitelyNotAddress = 
                        nextLine.matches(".*Có giá trị đến.*") ||
                        nextLine.matches(".*Date of expiry.*") ||
                        nextLine.matches(".*giá trị đến.*") ||
                        nextLine.matches(".*\\d{2}/\\d{2}/\\d{4}.*") ||
                        nextLine.matches(".*Ngày.*tháng.*năm.*") ||
                        nextLine.matches(".*Date.*month.*year.*") ||
                        nextLine.matches(".*Họ và tên.*") ||
                        nextLine.matches(".*Full name.*") ||
                        nextLine.matches(".*Số.*No.*") ||
                        nextLine.matches(".*Ngày sinh.*") ||
                        nextLine.matches(".*Date of birth.*") ||
                        nextLine.matches(".*Giới tính.*") ||
                        nextLine.matches(".*Sex.*") ||
                        nextLine.matches(".*Quê quán.*") ||
                        nextLine.matches(".*Place of birth.*") ||
                        nextLine.matches(".*Quốc tịch.*") ||
                        nextLine.matches(".*Nationality.*") ||
                        nextLine.matches(".*[A-Z]+<<[A-Z]+.*") || // MRZ
                        nextLine.matches(".*CĂN CƯỚC.*") || // Tiêu đề
                        nextLine.matches(".*CITIZEN.*") || // Tiêu đề tiếng Anh
                        nextLine.matches(".*CỘNG HÒA.*") || // Tiêu đề
                        nextLine.matches(".*SOCIALIST.*") || // Tiêu đề tiếng Anh
                        nextLine.matches(".*Độc lập.*") || // Khẩu hiệu
                        nextLine.matches(".*Independence.*") || // Khẩu hiệu tiếng Anh
                        nextLine.isEmpty() ||
                        nextLine.length() <= 2;
                    
                    System.out.println("=== DEBUG: Kiểm tra dòng " + j + ": '" + nextLine + "' - isDefinitelyNotAddress: " + isDefinitelyNotAddress + " ===");
                    
                    if (isDefinitelyNotAddress) {
                        // Dừng khi gặp dòng rõ ràng không phải địa chỉ
                        System.out.println("=== DEBUG: Dừng ở dòng " + j + " vì rõ ràng không phải địa chỉ: " + nextLine + " ===");
                        break;
                    } else {
                        // Thêm dòng này vào địa chỉ
                        if (address.length() > 0) {
                            address.append(", ");
                        }
                        address.append(nextLine);
                        System.out.println("=== DEBUG: Thêm dòng địa chỉ " + j + ": " + nextLine + " ===");
                        j++;
                    }
                }
                
                if (address.length() > 0) {
                    String finalAddress = address.toString().trim();
                    info.put("permanentAddress", finalAddress);
                    System.out.println("=== DEBUG: Đã trích xuất địa chỉ thường trú: " + finalAddress + " ===");
                } else {
                    System.out.println("=== DEBUG: Không tìm thấy địa chỉ thường trú ===");
                }
            }
            
            // Tìm ngày cấp (nếu có ở mặt trước)
            if (line.matches(".*Ngày.*tháng.*năm.*") || line.matches(".*Date.*month.*year.*")) {
                String next = (i + 1 < lines.size()) ? lines.get(i + 1) : "";
                Matcher m = Pattern.compile("\\d{2}/\\d{2}/\\d{4}").matcher(next + " " + line);
                if (m.find()) {
                    info.put("issueDate", m.group());
                    System.out.println("=== DEBUG: Tìm thấy ngày cấp trong mặt trước: " + m.group() + " ===");
                }
            }
            
            // Tìm tên từ MRZ (Machine Readable Zone) - thường ở cuối mặt trước
            if (line.matches(".*[A-Z]+<<[A-Z]+.*")) {
                System.out.println("=== DEBUG: Tìm thấy MRZ line trong mặt trước: " + line + " ===");
                // Tách tên từ MRZ format: TRAN<<VAN<HOANG<LONG
                String[] parts = line.split("<<");
                if (parts.length >= 2) {
                    String lastName = parts[0].trim();
                    String firstName = parts[1].replaceAll("<", " ").trim();
                    String fullNameMRZ = (lastName + " " + firstName).trim();
                    info.put("fullNameMRZFront", fullNameMRZ);
                    System.out.println("=== DEBUG: Trích xuất tên từ MRZ mặt trước: " + fullNameMRZ + " ===");
                }
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
            
            // Tìm số CCCD từ mặt sau (nếu có)
            if (line.matches(".*[0-9]{9,12}.*")) {
                String id = line.replaceAll("[^0-9]", "");
                if (id.length() >= 9 && id.length() <= 12) {
                    info.put("nationalIDBack", id);
                    System.out.println("=== DEBUG: Tìm thấy số CCCD ở mặt sau: " + id + " ===");
                }
            }
            
            // Tìm ngày sinh từ mặt sau (nếu có)
            if (line.matches(".*\\d{2}/\\d{2}/\\d{4}.*")) {
                Matcher m = Pattern.compile("\\d{2}/\\d{2}/\\d{4}").matcher(line);
                if (m.find()) {
                    String birthDate = m.group();
                    // Kiểm tra xem có phải ngày sinh không (thường ngày sinh < ngày hiện tại)
                    if (isValidBirthDate(birthDate)) {
                        info.put("birthDateBack", birthDate);
                        System.out.println("=== DEBUG: Tìm thấy ngày sinh ở mặt sau: " + birthDate + " ===");
                    }
                }
            }
            
            // Tìm ngày cấp từ mặt sau CCCD
            if (line.matches(".*Ngày.*tháng.*năm.*") || line.matches(".*Date.*month.*year.*") ||
                line.matches(".*Ngày.*tháng.*năm.*cấp.*") || line.matches(".*Date.*month.*year.*issued.*")) {
                
                System.out.println("=== DEBUG: Tìm thấy dòng ngày cấp: " + line + " ===");
                
                // Tìm ngày trong dòng hiện tại
                Matcher m = Pattern.compile("\\d{2}/\\d{2}/\\d{4}").matcher(line);
                if (m.find()) {
                    String issueDate = m.group();
                    info.put("issueDate", issueDate);
                    System.out.println("=== DEBUG: Tìm thấy ngày cấp trong dòng hiện tại: " + issueDate + " ===");
                } else {
                    // Tìm ở dòng tiếp theo
                    String next = (i + 1 < lines.size()) ? lines.get(i + 1) : "";
                    Matcher m2 = Pattern.compile("\\d{2}/\\d{2}/\\d{4}").matcher(next + " " + line);
                    if (m2.find()) {
                        String issueDate = m2.group();
                        info.put("issueDate", issueDate);
                        System.out.println("=== DEBUG: Tìm thấy ngày cấp ở dòng tiếp theo: " + issueDate + " ===");
                    }
                }
            }
            
            // Tìm ngày cấp từ các pattern khác
            if (line.matches(".*cấp.*") || line.matches(".*issued.*")) {
                // Kiểm tra xem có phải là ngày cấp không (không phải nơi cấp)
                if (!line.matches(".*Nơi cấp.*") && !line.matches(".*Place of issue.*") &&
                    !line.matches(".*Cục.*Cảnh sát.*") && !line.matches(".*Police.*")) {
                    
                    System.out.println("=== DEBUG: Tìm thấy dòng có thể chứa ngày cấp: " + line + " ===");
                    
                    // Tìm ngày trong dòng hiện tại
                    Matcher m = Pattern.compile("\\d{2}/\\d{2}/\\d{4}").matcher(line);
                    if (m.find()) {
                        String issueDate = m.group();
                        info.put("issueDate", issueDate);
                        System.out.println("=== DEBUG: Tìm thấy ngày cấp từ pattern khác: " + issueDate + " ===");
                    } else {
                        // Tìm ở dòng tiếp theo
                        String next = (i + 1 < lines.size()) ? lines.get(i + 1) : "";
                        Matcher m2 = Pattern.compile("\\d{2}/\\d{2}/\\d{4}").matcher(next + " " + line);
                        if (m2.find()) {
                            String issueDate = m2.group();
                            info.put("issueDate", issueDate);
                            System.out.println("=== DEBUG: Tìm thấy ngày cấp từ pattern khác ở dòng tiếp theo: " + issueDate + " ===");
                        }
                    }
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
            
            // Tìm tên từ MRZ với format khác (nếu có)
            if (line.matches(".*[A-Z]+<[A-Z]+.*") && !line.matches(".*[A-Z]+<<[A-Z]+.*")) {
                System.out.println("=== DEBUG: Tìm thấy MRZ line format khác: " + line + " ===");
                
                String mrzLine = line.trim();
                mrzLine = mrzLine.replaceAll("[^A-Z<]", "");
                
                // Xử lý format: DAO<NGOC<MINH
                String[] parts = mrzLine.split("<");
                if (parts.length >= 2) {
                    StringBuilder fullName = new StringBuilder();
                    for (String part : parts) {
                        if (!part.trim().isEmpty()) {
                            if (fullName.length() > 0) {
                                fullName.append(" ");
                            }
                            fullName.append(part.trim());
                        }
                    }
                    
                    String fullNameMRZ = fullName.toString().trim();
                    if (!fullNameMRZ.isEmpty()) {
                        // Chuẩn hóa tên MRZ
                        fullNameMRZ = normalizeName(fullNameMRZ);
                        
                        info.put("fullNameMRZ", fullNameMRZ);
                        System.out.println("=== DEBUG: Trích xuất tên từ MRZ format khác: " + fullNameMRZ + " ===");
                    }
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
            
            // Parse thông tin từ mặt sau (ngày cấp và tên từ MRZ)
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
        
        // Xác minh tính nhất quán của CCCD bằng cách so sánh nhiều trường
        System.out.println("=== DEBUG: Bắt đầu xác minh tính nhất quán CCCD ===");
        
        // 1. So sánh tên từ mặt trước với tên từ MRZ mặt sau (QUAN TRỌNG NHẤT)
        String frontName = (String) info.get("fullName");
        String backNameMRZ = (String) info.get("fullNameMRZ");
        
        if (frontName != null && backNameMRZ != null) {
            boolean namesMatch = compareNames(frontName, backNameMRZ);
            if (!namesMatch) {
                System.out.println("=== LỖI: Tên không khớp giữa 2 mặt CCCD ===");
                System.out.println("Mặt trước: " + frontName);
                System.out.println("Mặt sau (MRZ): " + backNameMRZ);
                throw new RuntimeException("Tên không khớp giữa 2 mặt CCCD. Có thể đây không phải là cùng một CCCD.");
            } else {
                System.out.println("=== THÀNH CÔNG: Tên khớp giữa 2 mặt CCCD ===");
            }
        } else {
            System.out.println("=== CẢNH BÁO: Không thể xác minh tên (thiếu thông tin) ===");
            if (frontName == null) System.out.println("Không tìm thấy tên ở mặt trước");
            if (backNameMRZ == null) System.out.println("Không tìm thấy tên ở mặt sau (MRZ)");
            
            // Nếu không có tên để so sánh, vẫn cho phép tiếp tục nhưng cảnh báo
            System.out.println("=== CẢNH BÁO: Tiếp tục xử lý nhưng không đảm bảo tính nhất quán ===");
        }
        
        // 2. So sánh tên từ MRZ mặt trước (nếu có) với tên từ MRZ mặt sau (KHÔNG BẮT BUỘC)
        String frontNameMRZ = (String) info.get("fullNameMRZFront");
        if (frontNameMRZ != null && backNameMRZ != null) {
            boolean mrzNamesMatch = compareNames(frontNameMRZ, backNameMRZ);
            if (!mrzNamesMatch) {
                System.out.println("=== CẢNH BÁO: Tên MRZ không khớp giữa 2 mặt CCCD ===");
                System.out.println("MRZ mặt trước: " + frontNameMRZ);
                System.out.println("MRZ mặt sau: " + backNameMRZ);
                System.out.println("=== CẢNH BÁO: Tiếp tục xử lý vì đây không phải validation bắt buộc ===");
            } else {
                System.out.println("=== THÀNH CÔNG: Tên MRZ khớp giữa 2 mặt CCCD ===");
            }
        }
        
        // 3. So sánh số CCCD (nếu có ở cả 2 mặt) - KHÔNG BẮT BUỘC
        String frontID = (String) info.get("nationalID");
        String backID = (String) info.get("nationalIDBack");
        if (frontID != null && backID != null) {
            boolean idMatch = frontID.equals(backID);
            if (!idMatch) {
                System.out.println("=== CẢNH BÁO: Số CCCD không khớp giữa 2 mặt ===");
                System.out.println("Mặt trước: " + frontID);
                System.out.println("Mặt sau: " + backID);
                System.out.println("=== CẢNH BÁO: Tiếp tục xử lý vì đây không phải validation bắt buộc ===");
            } else {
                System.out.println("=== THÀNH CÔNG: Số CCCD khớp giữa 2 mặt ===");
            }
        }
        
        // 4. So sánh ngày sinh (nếu có ở cả 2 mặt) - KHÔNG BẮT BUỘC
        String frontBirthDate = (String) info.get("birthDate");
        String backBirthDate = (String) info.get("birthDateBack");
        if (frontBirthDate != null && backBirthDate != null) {
            boolean birthDateMatch = frontBirthDate.equals(backBirthDate);
            if (!birthDateMatch) {
                System.out.println("=== CẢNH BÁO: Ngày sinh không khớp giữa 2 mặt ===");
                System.out.println("Mặt trước: " + frontBirthDate);
                System.out.println("Mặt sau: " + backBirthDate);
                System.out.println("=== CẢNH BÁO: Tiếp tục xử lý vì đây không phải validation bắt buộc ===");
            } else {
                System.out.println("=== THÀNH CÔNG: Ngày sinh khớp giữa 2 mặt ===");
            }
        }
        
        // Debug: In ra kết quả cuối cùng
        System.out.println("=== DEBUG: Kết quả OCR cuối cùng ===");
        for (Map.Entry<String, Object> entry : info.entrySet()) {
            System.out.println(entry.getKey() + ": " + entry.getValue());
        }
        System.out.println("=== END DEBUG ===");
        
        // Thêm debug chi tiết cho việc so sánh tên
        System.out.println("=== DEBUG: Chi tiết so sánh tên ===");
        if (frontName != null && backNameMRZ != null) {
            String normalizedFront = normalizeName(frontName);
            String normalizedBack = normalizeName(backNameMRZ);
            System.out.println("Tên mặt trước (gốc): " + frontName);
            System.out.println("Tên mặt sau MRZ (gốc): " + backNameMRZ);
            System.out.println("Tên mặt trước (chuẩn hóa): " + normalizedFront);
            System.out.println("Tên mặt sau MRZ (chuẩn hóa): " + normalizedBack);
            System.out.println("Độ dài tên mặt trước: " + normalizedFront.length());
            System.out.println("Độ dài tên mặt sau: " + normalizedBack.length());
            System.out.println("Chênh lệch độ dài: " + Math.abs(normalizedFront.length() - normalizedBack.length()));
        }
        System.out.println("=== END DEBUG CHI TIẾT ===");
        
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
        
        // Loại bỏ các ký tự đặc biệt và số
        normalized = normalized.replaceAll("[^A-Z\\s]", "");
        
        // Loại bỏ khoảng trắng thừa
        normalized = normalized.replaceAll("\\s+", " ").trim();
        
        // Xử lý các trường hợp đặc biệt
        // Ví dụ: "DAO NGOC MINH" vs "DAO<<NGOC<MINH" -> "DAO NGOC MINH"
        normalized = normalized.replaceAll("<<", " ");
        normalized = normalized.replaceAll("<", " ");
        
        // Loại bỏ khoảng trắng thừa sau khi xử lý
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
        
        // So sánh chính xác trước
        boolean exactMatch = normalizedFront.equals(normalizedBack);
        if (exactMatch) {
            System.out.println("Kết quả so sánh: KHỚP CHÍNH XÁC");
            return true;
        }
        
        // Nếu không khớp chính xác, thử fuzzy matching
        boolean fuzzyMatch = fuzzyNameMatch(normalizedFront, normalizedBack);
        if (fuzzyMatch) {
            System.out.println("Kết quả so sánh: KHỚP FUZZY (có thể có lỗi OCR nhỏ)");
            return true;
        }
        
        System.out.println("Kết quả so sánh: KHÔNG KHỚP");
        return false;
    }
    
    // Hàm fuzzy matching cho tên
    private boolean fuzzyNameMatch(String name1, String name2) {
        if (name1 == null || name2 == null) return false;
        
        // Nếu độ dài chênh lệch quá lớn, không thể khớp
        int lengthDiff = Math.abs(name1.length() - name2.length());
        if (lengthDiff > 5) return false; // Tăng từ 3 lên 5 để linh hoạt hơn
        
        // Tính độ tương đồng bằng thuật toán Levenshtein
        int distance = levenshteinDistance(name1, name2);
        int maxLength = Math.max(name1.length(), name2.length());
        
        // Nếu độ tương đồng > 70%, coi như khớp (giảm từ 80% xuống 70%)
        double similarity = 1.0 - ((double) distance / maxLength);
        boolean isMatch = similarity > 0.7;
        
        System.out.println("=== DEBUG: Fuzzy matching ===");
        System.out.println("Levenshtein distance: " + distance);
        System.out.println("Max length: " + maxLength);
        System.out.println("Similarity: " + String.format("%.2f", similarity * 100) + "%");
        System.out.println("Fuzzy match result: " + (isMatch ? "KHỚP" : "KHÔNG KHỚP"));
        
        return isMatch;
    }
    
    // Thuật toán Levenshtein để tính khoảng cách giữa 2 chuỗi
    private int levenshteinDistance(String s1, String s2) {
        int[][] dp = new int[s1.length() + 1][s2.length() + 1];
        
        for (int i = 0; i <= s1.length(); i++) {
            dp[i][0] = i;
        }
        
        for (int j = 0; j <= s2.length(); j++) {
            dp[0][j] = j;
        }
        
        for (int i = 1; i <= s1.length(); i++) {
            for (int j = 1; j <= s2.length(); j++) {
                if (s1.charAt(i - 1) == s2.charAt(j - 1)) {
                    dp[i][j] = dp[i - 1][j - 1];
                } else {
                    dp[i][j] = Math.min(dp[i - 1][j - 1] + 1, 
                                      Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1));
                }
            }
        }
        
        return dp[s1.length()][s2.length()];
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
    
    // Hàm kiểm tra ngày sinh hợp lệ
    private boolean isValidBirthDate(String birthDate) {
        try {
            // Parse ngày theo format DD/MM/YYYY
            String[] parts = birthDate.split("/");
            if (parts.length != 3) return false;
            
            int day = Integer.parseInt(parts[0]);
            int month = Integer.parseInt(parts[1]);
            int year = Integer.parseInt(parts[2]);
            
            // Kiểm tra ngày tháng hợp lệ
            if (day < 1 || day > 31 || month < 1 || month > 12) return false;
            
            // Kiểm tra năm hợp lệ (thường từ 1900 đến năm hiện tại)
            int currentYear = java.time.Year.now().getValue();
            if (year < 1900 || year > currentYear) return false;
            
            // Kiểm tra ngày sinh phải nhỏ hơn ngày hiện tại
            java.time.LocalDate birth = java.time.LocalDate.of(year, month, day);
            java.time.LocalDate now = java.time.LocalDate.now();
            
            return birth.isBefore(now);
        } catch (Exception e) {
            return false;
        }
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