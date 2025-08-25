package com.mpbhms.backend.service;

import com.mpbhms.backend.config.VnPayConfig;
import com.mpbhms.backend.entity.Bill;
import com.mpbhms.backend.entity.BillDetail;
import com.mpbhms.backend.repository.BillRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.Instant;
import java.time.Duration;
import java.time.format.DateTimeFormatter;
import java.time.ZoneId;
import java.util.*;
import com.mpbhms.backend.entity.PaymentHistory;
import com.mpbhms.backend.repository.PaymentHistoryRepository;

@Service
public class VnPayService {
    @Autowired
    private BillRepository billRepository;
    @Autowired
    private PaymentHistoryRepository paymentHistoryRepository;

    public String createPaymentUrl(Long billId, Long amount, String orderInfo) throws Exception {
        // Đảm bảo số tiền hợp lệ
        if (amount == null || amount <= 0) {
            throw new IllegalArgumentException("Số tiền không hợp lệ: " + amount);
        }

        // Nếu billId hợp lệ, đồng bộ lại tổng tiền hóa đơn
        if (billId != null && billId > 0) {
            Bill bill = billRepository.findById(billId).orElse(null);
            if (bill == null) {
                throw new IllegalArgumentException("Không tìm thấy hóa đơn: " + billId);
            }

            // 🆕 KIỂM TRA XEM CÓ YÊU CẦU THANH TOÁN TIỀN MẶT ĐANG CHỜ XỬ LÝ KHÔNG
            // Nếu có, không cho phép tạo thanh toán VNPAY
            if (bill.getPaymentUrlLockedUntil() != null && bill.getPaymentUrlLockedUntil().isAfter(Instant.now())) {
                // Kiểm tra xem có phải là khóa từ thanh toán tiền mặt không
                // Nếu có PaymentHistory PENDING, thì đây là thanh toán tiền mặt
                List<PaymentHistory> pendingPayments = paymentHistoryRepository.findByBillIdAndStatusOrderByPaymentDateDesc(billId, "PENDING");
                if (!pendingPayments.isEmpty()) {
                    long secondsLeft = java.time.Duration.between(Instant.now(), bill.getPaymentUrlLockedUntil()).getSeconds();
                    long minutesLeft = (secondsLeft + 59) / 60; // làm tròn lên phút còn lại
                    throw new IllegalStateException("Không thể tạo thanh toán VNPAY vì đã có yêu cầu thanh toán tiền mặt đang chờ xử lý. Vui lòng đợi thêm " + minutesLeft + " phút nữa hoặc xử lý yêu cầu thanh toán tiền mặt trước.");
                }
            }

            // Kiểm tra khóa tạo URL thanh toán trong 15 phút
            Instant now = Instant.now();
            if (bill.getPaymentUrlLockedUntil() != null && now.isBefore(bill.getPaymentUrlLockedUntil())) {
                long secondsLeft = Duration.between(now, bill.getPaymentUrlLockedUntil()).getSeconds();
                long minutesLeft = (secondsLeft + 59) / 60; // làm tròn lên phút còn lại
                throw new IllegalStateException("Bạn đã tạo link thanh toán trước đó. Vui lòng đợi thêm " + minutesLeft + " phút nữa để tạo lại.");
            }

            // Đồng bộ tổng tiền nếu cần
            if (bill != null) {
                java.math.BigDecimal sum = bill.getBillDetails().stream()
                        .map(BillDetail::getItemAmount)
                        .reduce(java.math.BigDecimal.ZERO, java.math.BigDecimal::add);
                if (bill.getTotalAmount() == null || bill.getTotalAmount().compareTo(sum) != 0) {
                    bill.setTotalAmount(sum);
                    billRepository.save(bill);
                    // Chỉ cập nhật amount nếu không có amount được truyền vào
                    if (amount == null || amount <= 0) {
                    amount = sum.longValue();
                }
            }
        }
            // Đặt khóa 15 phút để chống tạo trùng link
            bill.setPaymentUrlLockedUntil(now.plus(Duration.ofMinutes(15)));
            billRepository.save(bill);
        }

        // Làm sạch orderInfo: chỉ cho phép chữ, số, khoảng trắng
        String vnp_OrderInfo = orderInfo;
        String vnp_TxnRef = billId + "-" + System.currentTimeMillis();
        String vnp_OrderType = "other";
        String vnp_Amount = String.valueOf(amount * 100); // VNPay yêu cầu x100
        
        // Debug logging
        System.out.println("[VNPay] BillId: " + billId);
        System.out.println("[VNPay] Original Amount: " + amount);
        System.out.println("[VNPay] VNP Amount (x100): " + vnp_Amount);
        System.out.println("[VNPay] OrderInfo: " + vnp_OrderInfo);

        // ✅ Dùng thời gian thực tế
        String vnp_CreateDate = LocalDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh"))
                .format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));

        String vnp_ExpireDate = LocalDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh"))
                .plusMinutes(15)
                .format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));

        Map<String, String> vnp_Params = new HashMap<>();
        vnp_Params.put("vnp_Version", VnPayConfig.vnp_Version);
        vnp_Params.put("vnp_Command", VnPayConfig.vnp_Command);
        vnp_Params.put("vnp_TmnCode", VnPayConfig.vnp_TmnCode);
        vnp_Params.put("vnp_Amount", vnp_Amount);
        vnp_Params.put("vnp_CurrCode", "VND");
        vnp_Params.put("vnp_TxnRef", vnp_TxnRef);
        vnp_Params.put("vnp_OrderInfo", vnp_OrderInfo);
        vnp_Params.put("vnp_OrderType", vnp_OrderType);
        vnp_Params.put("vnp_Locale", "vn");
        vnp_Params.put("vnp_ReturnUrl", VnPayConfig.vnp_ReturnUrl);
        vnp_Params.put("vnp_IpAddr", "127.0.0.1");
        vnp_Params.put("vnp_CreateDate", vnp_CreateDate);
        vnp_Params.put("vnp_ExpireDate", vnp_ExpireDate);

        List<String> fieldNames = new ArrayList<>(vnp_Params.keySet());
        Collections.sort(fieldNames);

        StringBuilder hashData = new StringBuilder();
        StringBuilder query = new StringBuilder();

        for (String fieldName : fieldNames) {
            String value = vnp_Params.get(fieldName);
            if (value != null && !value.isEmpty()) {
                String encodedValue = URLEncoder.encode(value, StandardCharsets.UTF_8.toString());
                hashData.append(fieldName).append('=').append(encodedValue).append('&');
                query.append(fieldName).append('=').append(encodedValue).append('&');
            }
        }

        hashData.setLength(hashData.length() - 1);
        query.setLength(query.length() - 1);

        String secureHash = hmacSHA512(VnPayConfig.vnp_HashSecret, hashData.toString());
        query.append("&vnp_SecureHashType=HmacSHA512&vnp_SecureHash=").append(secureHash);

        System.out.println("[VNPay] HashData = " + hashData);
        System.out.println("[VNPay] SecureHash = " + secureHash);

        return VnPayConfig.vnp_PayUrl + "?" + query.toString();
    }

    public boolean validateSignature(Map<String, String> fields, String secureHash) throws Exception {
        System.out.println("=== VNPAY SIGNATURE VALIDATION DEBUG ===");
        System.out.println("Received secureHash: " + secureHash);
        System.out.println("Config HashSecret: " + VnPayConfig.vnp_HashSecret);
        
        List<String> fieldNames = new ArrayList<>(fields.keySet());
        Collections.sort(fieldNames);
        StringBuilder hashData = new StringBuilder();

        System.out.println("Sorted field names: " + fieldNames);

        for (String fieldName : fieldNames) {
            if ("vnp_SecureHash".equals(fieldName) || "vnp_SecureHashType".equals(fieldName)) {
                System.out.println("Skipping field: " + fieldName);
                continue;
            }
            String value = fields.get(fieldName);
            if (value != null && !value.isEmpty()) {
                // URL encode the value as VNPAY expects
                String encodedValue = URLEncoder.encode(value, StandardCharsets.UTF_8.toString());
                hashData.append(fieldName).append('=').append(encodedValue).append('&');
                System.out.println("Adding to hashData: " + fieldName + "=" + encodedValue + " (original: " + value + ")");
            }
        }

        hashData.setLength(hashData.length() - 1);
        String finalHashData = hashData.toString();
        System.out.println("Final hashData: " + finalHashData);
        
        String signValue = hmacSHA512(VnPayConfig.vnp_HashSecret, finalHashData);
        System.out.println("Calculated signValue: " + signValue);
        System.out.println("Signature match: " + signValue.equals(secureHash));
        
        return signValue.equals(secureHash);
    }

    private String hmacSHA512(String key, String data) throws Exception {
        javax.crypto.Mac hmac512 = javax.crypto.Mac.getInstance("HmacSHA512");
        javax.crypto.spec.SecretKeySpec secretKey = new javax.crypto.spec.SecretKeySpec(
                key.getBytes(StandardCharsets.UTF_8), "HmacSHA512");
        hmac512.init(secretKey);
        byte[] bytes = hmac512.doFinal(data.getBytes(StandardCharsets.UTF_8));

        StringBuilder hash = new StringBuilder();
        for (byte b : bytes) {
            String hex = Integer.toHexString(0xff & b);
            if (hex.length() == 1) hash.append('0');
            hash.append(hex);
        }
        return hash.toString();
    }
    public Long extractBillIdFromTxnRef(String txnRef) {
        if (txnRef != null && txnRef.contains("-")) {
            try {
                return Long.valueOf(txnRef.split("-")[0]);
            } catch (NumberFormatException e) {
                return null;
            }
        }
        return null;
    }

}
