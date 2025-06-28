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
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
public class VnPayService {
    @Autowired
    private BillRepository billRepository;

    public String createPaymentUrl(Long billId, Long amount, String orderInfo) throws Exception {
        // Nếu billId hợp lệ, đồng bộ lại tổng tiền hóa đơn
        if (billId != null && billId > 0) {
            Bill bill = billRepository.findById(billId).orElse(null);
            if (bill != null) {
                java.math.BigDecimal sum = bill.getBillDetails().stream()
                        .map(BillDetail::getItemAmount)
                        .reduce(java.math.BigDecimal.ZERO, java.math.BigDecimal::add);
                if (bill.getTotalAmount() == null || bill.getTotalAmount().compareTo(sum) != 0) {
                    bill.setTotalAmount(sum);
                    billRepository.save(bill);
                    amount = sum.longValue();
                }
            }
        }

        if (amount == null || amount <= 0) {
            throw new IllegalArgumentException("Số tiền không hợp lệ");
        }

        String vnp_OrderInfo = "Thanh toán hóa đơn #" + billId;
        String vnp_TxnRef = String.valueOf(System.currentTimeMillis());
        String vnp_Amount = String.valueOf(amount * 100);

        // ✅ Dùng thời gian thực tế
        String vnp_CreateDate = LocalDateTime.now()
                .format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));

        String vnp_ExpireDate = LocalDateTime.now()
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
        vnp_Params.put("vnp_OrderType", "other");
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
        List<String> fieldNames = new ArrayList<>(fields.keySet());
        Collections.sort(fieldNames);
        StringBuilder hashData = new StringBuilder();

        for (String fieldName : fieldNames) {
            if ("vnp_SecureHash".equals(fieldName) || "vnp_SecureHashType".equals(fieldName)) continue;
            String value = fields.get(fieldName);
            if (value != null && !value.isEmpty()) {
                hashData.append(fieldName).append('=').append(value).append('&');
            }
        }

        hashData.setLength(hashData.length() - 1);
        String signValue = hmacSHA512(VnPayConfig.vnp_HashSecret, hashData.toString());
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
}
