package com.mpbhms.backend.controller;

import com.mpbhms.backend.service.VnPayService;
import com.mpbhms.backend.repository.BillRepository;
import com.mpbhms.backend.entity.Bill;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;
import java.util.HashMap;
import java.util.Map;
import java.time.Instant;

@RestController
@RequestMapping("/mpbhms/payment")
public class PaymentController {
    @Autowired
    private VnPayService vnPayService;

    @Autowired
    private BillRepository billRepository;

    // 1. API tạo URL thanh toán VNPay
    @PostMapping("/create-vnpay-url")
    public ResponseEntity<?> createVnPayUrl(@RequestBody Map<String, Object> payload) {
        try {
            Long billId = Long.valueOf(payload.get("billId").toString());
            Long amount = Long.valueOf(payload.get("amount").toString());
            String orderInfo = payload.getOrDefault("orderInfo", "Thanh toan hoa don").toString();
            String url = vnPayService.createPaymentUrl(billId, amount, orderInfo);
            Map<String, String> res = new HashMap<>();
            res.put("paymentUrl", url);
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // 2. API nhận returnUrl từ VNPay (user redirect về)
    @GetMapping("/vnpay-return")
    public ResponseEntity<?> vnpayReturn(HttpServletRequest request) {
        Map<String, String[]> params = request.getParameterMap();
        Map<String, String> fields = new HashMap<>();
        for (String key : params.keySet()) {
            fields.put(key, params.get(key)[0]);
        }
        String vnp_SecureHash = fields.get("vnp_SecureHash");
        try {
            boolean valid = vnPayService.validateSignature(fields, vnp_SecureHash);
            if (valid && "00".equals(fields.get("vnp_ResponseCode"))) {
                // Lấy billId từ callback
                Long billId = null;
                if (fields.containsKey("vnp_BillId")) {
                    billId = Long.valueOf(fields.get("vnp_BillId"));
                }
                if (billId != null) {
                    Bill bill = billRepository.findById(billId).orElse(null);
                    if (bill != null && (bill.getStatus() == null || !bill.getStatus())) {
                        bill.setStatus(true);
                        bill.setPaidDate(Instant.now());
                        billRepository.save(bill);
                    }
                }
                return ResponseEntity.ok("Thanh toán thành công!");
            } else {
                return ResponseEntity.badRequest().body("Thanh toán thất bại hoặc sai chữ ký!");
            }
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // 3. API nhận IPN từ VNPay (notifyUrl)
    @GetMapping("/vnpay-ipn")
    public ResponseEntity<?> vnpayIpn(HttpServletRequest request) {
        Map<String, String[]> params = request.getParameterMap();
        Map<String, String> fields = new HashMap<>();
        for (String key : params.keySet()) {
            fields.put(key, params.get(key)[0]);
        }
        String vnp_SecureHash = fields.get("vnp_SecureHash");
        try {
            boolean valid = vnPayService.validateSignature(fields, vnp_SecureHash);
            if (valid && "00".equals(fields.get("vnp_ResponseCode"))) {
                // Lấy billId từ callback
                Long billId = null;
                if (fields.containsKey("vnp_BillId")) {
                    billId = Long.valueOf(fields.get("vnp_BillId"));
                }
                if (billId != null) {
                    Bill bill = billRepository.findById(billId).orElse(null);
                    if (bill != null && (bill.getStatus() == null || !bill.getStatus())) {
                        bill.setStatus(true);
                        bill.setPaidDate(Instant.now());
                        billRepository.save(bill);
                    }
                }
                return ResponseEntity.ok("{\"RspCode\":\"00\",\"Message\":\"Confirm Success\"}");
            } else {
                return ResponseEntity.badRequest().body("{\"RspCode\":\"97\",\"Message\":\"Invalid signature\"}");
            }
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
} 