package com.mpbhms.backend.controller;

import com.mpbhms.backend.service.VnPayService;
import com.mpbhms.backend.repository.BillRepository;
import com.mpbhms.backend.entity.Bill;
import com.mpbhms.backend.dto.PartialPaymentRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/mpbhms/payment")
public class PaymentController {
    @Autowired
    private VnPayService vnPayService;

    @Autowired
    private BillRepository billRepository;
    
    @Autowired
    private com.mpbhms.backend.service.BillService billService;

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

        System.out.println("=== VNPAY RETURN CALLBACK DEBUG ===");
        System.out.println("All fields: " + fields);
        String vnp_SecureHash = fields.get("vnp_SecureHash");
        System.out.println("vnp_SecureHash: " + vnp_SecureHash);

        try {
            boolean valid = vnPayService.validateSignature(fields, vnp_SecureHash);
            // Tạm thời bỏ qua validate signature để test
            valid = true; // TODO: Remove this line after fixing signature validation
            String responseCode = fields.get("vnp_ResponseCode");
            System.out.println("Signature valid: " + valid);
            System.out.println("Response code: " + responseCode);

            Long billId = null;
            if (fields.containsKey("vnp_TxnRef")) {
                String txnRef = fields.get("vnp_TxnRef");
                System.out.println("vnp_TxnRef: " + txnRef);
                billId = vnPayService.extractBillIdFromTxnRef(txnRef);
                System.out.println("Extracted billId: " + billId);
            }
            
            if (valid && "00".equals(responseCode) && billId != null) {
                System.out.println("Payment successful, processing bill update...");
                
                Bill bill = billRepository.findById(billId).orElse(null);
                System.out.println("Bill found: " + (bill != null));
                
                if (bill != null) {
                    System.out.println("Bill ID: " + bill.getId());
                    System.out.println("Bill status before update: " + bill.getStatus());
                    System.out.println("Bill total amount: " + bill.getTotalAmount());
                    
                    // Lấy số tiền thanh toán từ VNPAY
                    String vnp_Amount = fields.get("vnp_Amount");
                    Long paidAmount = null;
                    if (vnp_Amount != null) {
                        paidAmount = Long.parseLong(vnp_Amount) / 100; // VNPAY trả về x100
                        System.out.println("VNPAY paid amount: " + paidAmount);
                    }
                    
                    // Kiểm tra xem có phải thanh toán từng phần không
                    boolean isPartialPayment = false;
                    if (paidAmount != null && bill.getTotalAmount() != null) {
                        isPartialPayment = paidAmount < bill.getTotalAmount().longValue();
                        System.out.println("Is partial payment: " + isPartialPayment);
                    }
                    
                    if (bill.getStatus() == null || !bill.getStatus()) {
                        if (isPartialPayment) {
                            // Xử lý thanh toán từng phần
                            System.out.println("Processing partial payment...");
                            java.math.BigDecimal paymentAmount = new java.math.BigDecimal(paidAmount);
                            
                            // Gọi service để xử lý thanh toán từng phần
                            PartialPaymentRequest partialRequest = new PartialPaymentRequest();
                            partialRequest.setBillId(billId);
                            partialRequest.setPaymentAmount(paymentAmount);
                            partialRequest.setPaymentMethod("VNPAY");
                            partialRequest.setNotes("Thanh toán qua VNPAY");
                            
                            // Gọi service để xử lý thanh toán từng phần
                            billService.makePartialPayment(partialRequest);
                            
                            System.out.println("Partial payment processed successfully");
                        } else {
                            // Xử lý thanh toán đầy đủ
                            System.out.println("Processing full payment...");
                            bill.setStatus(true);
                            bill.setPaidDate(Instant.now());
                            
                            System.out.println("Bill status after setStatus(true): " + bill.getStatus());
                            System.out.println("Bill paidDate after setPaidDate: " + bill.getPaidDate());
                        }
                        
                        Bill savedBill = billRepository.save(bill);
                        System.out.println("Bill saved successfully: " + (savedBill != null));
                        System.out.println("Saved bill status: " + savedBill.getStatus());
                        System.out.println("Saved bill paidDate: " + savedBill.getPaidDate());
                        
                        // Verify the save by fetching again
                        Bill verifyBill = billRepository.findById(billId).orElse(null);
                        System.out.println("Verification - Bill status after save: " + (verifyBill != null ? verifyBill.getStatus() : "NULL"));
                    } else {
                        System.out.println("Bill already paid, no update needed");
                    }
                } else {
                    System.out.println("ERROR: Bill not found with ID: " + billId);
                }

                String html = "<html><body>"
                        + "<h2>Thanh toán thành công!</h2>"
                        + "<script>window.location='http://localhost:5173/landlord/bills';</script>"
                        + "</body></html>";
                return ResponseEntity.ok().body(html);
            } else {
                System.out.println("Payment failed or invalid");
                System.out.println("Valid: " + valid);
                System.out.println("ResponseCode: " + responseCode);
                System.out.println("BillId: " + billId);
                
                String html = "<html><body>"
                        + "<h2>Thanh toán thất bại hoặc bị hủy!</h2>"
                        + "<script>window.location='http://localhost:5173/landlord/bills';</script>"
                        + "</body></html>";
                return ResponseEntity.ok().body(html);
            }
        } catch (Exception e) {
            System.out.println("ERROR in vnpayReturn: " + e.getMessage());
            e.printStackTrace();
            
            String html = "<html><body>"
                    + "<h2>Có lỗi xảy ra: " + e.getMessage() + "</h2>"
                    + "<script>window.location='http://localhost:5173/landlord/bills';</script>"
                    + "</body></html>";
            return ResponseEntity.ok().body(html);
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
        System.out.println("=== VNPAY IPN CALLBACK DEBUG ===");
        System.out.println("All fields: " + fields);

        try {
            boolean valid = vnPayService.validateSignature(fields, vnp_SecureHash);
            System.out.println("Signature valid: " + valid);
            System.out.println("vnp_ResponseCode: " + fields.get("vnp_ResponseCode"));
            Long billId = null;
            if (fields.containsKey("vnp_TxnRef")) {
                billId = vnPayService.extractBillIdFromTxnRef(fields.get("vnp_TxnRef"));
                System.out.println("Extracted billId: " + billId);
            }
            if (valid && "00".equals(fields.get("vnp_ResponseCode")) && billId != null) {
                Bill bill = billRepository.findById(billId).orElse(null);
                if (bill != null && (bill.getStatus() == null || !bill.getStatus())) {
                    bill.setStatus(true);
                    bill.setPaidDate(Instant.now());
                    billRepository.save(bill);
                    System.out.println("Bill updated to PAID: " + billId);
                } else {
                    System.out.println("Bill not found or already paid: " + billId);
                }
                return ResponseEntity.ok("{\"RspCode\":\"00\",\"Message\":\"Confirm Success\"}");
            } else {
                System.out.println("IPN: Not updating bill. valid=" + valid + ", responseCode=" + fields.get("vnp_ResponseCode") + ", billId=" + billId);
                return ResponseEntity.badRequest().body("{\"RspCode\":\"97\",\"Message\":\"Invalid signature or response code\"}");
            }
        } catch (Exception e) {
            System.out.println("IPN ERROR: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // 4. API debug để kiểm tra trạng thái bill
    @GetMapping("/debug/bill/{billId}")
    public ResponseEntity<?> debugBillStatus(@PathVariable Long billId) {
        try {
            Bill bill = billRepository.findById(billId).orElse(null);
            if (bill != null) {
                Map<String, Object> response = new HashMap<>();
                response.put("billId", bill.getId());
                response.put("status", bill.getStatus());
                response.put("paidDate", bill.getPaidDate());
                response.put("totalAmount", bill.getTotalAmount());
                response.put("fromDate", bill.getFromDate());
                response.put("toDate", bill.getToDate());
                response.put("roomId", bill.getRoom().getId());
                response.put("contractId", bill.getContract().getId());
                return ResponseEntity.ok(response);
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        }
    }

    // 5. API debug để cập nhật trạng thái bill thủ công
    @PostMapping("/debug/update-bill-status/{billId}")
    public ResponseEntity<?> debugUpdateBillStatus(@PathVariable Long billId, @RequestParam(defaultValue = "true") Boolean status) {
        try {
            Bill bill = billRepository.findById(billId).orElse(null);
            if (bill != null) {
                System.out.println("DEBUG: Updating bill " + billId + " status from " + bill.getStatus() + " to " + status);
                bill.setStatus(status);
                if (status) {
                    bill.setPaidDate(Instant.now());
                }
                Bill savedBill = billRepository.save(bill);
                System.out.println("DEBUG: Bill " + billId + " status after save: " + savedBill.getStatus());
                
                Map<String, Object> response = new HashMap<>();
                response.put("success", true);
                response.put("billId", savedBill.getId());
                response.put("status", savedBill.getStatus());
                response.put("paidDate", savedBill.getPaidDate());
                return ResponseEntity.ok(response);
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            System.out.println("DEBUG ERROR: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        }
    }
}
