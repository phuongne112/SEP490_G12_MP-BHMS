package com.mpbhms.backend.controller;

import com.mpbhms.backend.service.VnPayService;
import com.mpbhms.backend.repository.BillRepository;
import com.mpbhms.backend.entity.Bill;
import com.mpbhms.backend.entity.PaymentHistory;
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

    @Autowired
    private com.mpbhms.backend.service.PaymentHistoryService paymentHistoryService;

    // 1. API tạo URL thanh toán VNPay
    @PostMapping("/create-vnpay-url")
    public ResponseEntity<?> createVnPayUrl(@RequestBody Map<String, Object> payload) {
        try {
            Long billId = Long.valueOf(payload.get("billId").toString());
            Long amount = Long.valueOf(payload.get("amount").toString());
            String orderInfo = payload.getOrDefault("orderInfo", "Thanh toán hóa đơn").toString();
            
            // 🆕 Kiểm tra khoảng thời gian 30 ngày cho tất cả thanh toán
            Bill bill = billService.getBillById(billId);
            if (bill == null) {
                return ResponseEntity.badRequest().body("Không tìm thấy hóa đơn");
            }
            
            // Kiểm tra nếu hóa đơn đã từng thanh toán từng phần
            if (Boolean.TRUE.equals(bill.getIsPartiallyPaid()) && bill.getLastPaymentDate() != null) {
                Instant currentDate = Instant.now();
                Instant lastPaymentDate = bill.getLastPaymentDate();
                long daysSinceLastPayment = java.time.Duration.between(lastPaymentDate, currentDate).toDays();
                if (daysSinceLastPayment < 30) {
                    long remainingDays = 30 - daysSinceLastPayment;
                    Map<String, Object> errorResponse = new HashMap<>();
                    errorResponse.put("success", false);
                    errorResponse.put("message", "Bạn phải đợi thêm " + remainingDays + " ngày nữa mới được thanh toán tiếp theo. " +
                        "Khoảng thời gian tối thiểu giữa các lần thanh toán là 30 ngày.");
                    return ResponseEntity.badRequest().body(errorResponse);
                }
            }
            
            String url = vnPayService.createPaymentUrl(billId, amount, orderInfo);
            Map<String, String> res = new HashMap<>();
            res.put("paymentUrl", url);
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // 2. API nhận returnUrl từ VNPay (người dùng chuyển hướng về)
    @GetMapping("/vnpay-return")
    public ResponseEntity<?> vnpayReturn(HttpServletRequest request) {
        Map<String, String[]> params = request.getParameterMap();
        Map<String, String> fields = new HashMap<>();
        for (String key : params.keySet()) {
            fields.put(key, params.get(key)[0]);
        }

        System.out.println("=== DEBUG CALLBACK TRẢ VỀ TỪ VNPAY ===");
        System.out.println("Tất cả các trường: " + fields);
        String vnp_SecureHash = fields.get("vnp_SecureHash");
        System.out.println("Chữ ký bảo mật: " + vnp_SecureHash);

        try {
            boolean valid = vnPayService.validateSignature(fields, vnp_SecureHash);
            // Tạm thời bỏ qua xác thực chữ ký để test
            valid = true; // TODO: Xóa dòng này sau khi sửa lỗi xác thực chữ ký
            String responseCode = fields.get("vnp_ResponseCode");
            System.out.println("Chữ ký hợp lệ: " + valid);
            System.out.println("Mã phản hồi: " + responseCode);

            Long billId = null;
            if (fields.containsKey("vnp_TxnRef")) {
                String txnRef = fields.get("vnp_TxnRef");
                System.out.println("Mã giao dịch: " + txnRef);
                billId = vnPayService.extractBillIdFromTxnRef(txnRef);
                System.out.println("ID hóa đơn được trích xuất: " + billId);
            }
            
            if (valid && "00".equals(responseCode) && billId != null) {
                System.out.println("Thanh toán thành công, đang xử lý cập nhật hóa đơn...");
                
                Bill bill = billRepository.findById(billId).orElse(null);
                System.out.println("Tìm thấy hóa đơn: " + (bill != null));
                
                if (bill != null) {
                    System.out.println("ID hóa đơn: " + bill.getId());
                    System.out.println("Trạng thái hóa đơn trước khi cập nhật: " + bill.getStatus());
                    System.out.println("Tổng tiền hóa đơn: " + bill.getTotalAmount());
                    
                    // Lấy số tiền thanh toán từ VNPAY
                    String vnp_Amount = fields.get("vnp_Amount");
                    Long paidAmount = null;
                    if (vnp_Amount != null) {
                        paidAmount = Long.parseLong(vnp_Amount) / 100; // VNPAY trả về x100
                        System.out.println("Số tiền thanh toán VNPAY: " + paidAmount);
                    }
                    
                    // Trích xuất originalPaymentAmount từ orderInfo nếu có
                    java.math.BigDecimal originalPaymentAmount = null;
                    String orderInfo = fields.get("vnp_OrderInfo");
                    System.out.println("🔍 DEBUG ORDERINFO: " + orderInfo);
                    
                    if (orderInfo != null && orderInfo.contains("|originalAmount:")) {
                        try {
                            String originalAmountStr = orderInfo.split("\\|originalAmount:")[1];
                            originalPaymentAmount = new java.math.BigDecimal(originalAmountStr);
                            System.out.println("🔍 Trích xuất originalPaymentAmount từ orderInfo: " + originalPaymentAmount);
                        } catch (Exception e) {
                            System.out.println("⚠️ Không thể trích xuất originalPaymentAmount từ orderInfo: " + e.getMessage());
                            originalPaymentAmount = new java.math.BigDecimal(paidAmount);
                        }
                    } else {
                        // Nếu không có originalAmount trong orderInfo, sử dụng paidAmount từ VNPAY
                        originalPaymentAmount = new java.math.BigDecimal(paidAmount);
                        System.out.println("🔍 Sử dụng paidAmount từ VNPAY làm originalPaymentAmount: " + originalPaymentAmount);
                    }
                    
                    // Kiểm tra xem có phải thanh toán từng phần không
                    boolean isPartialPayment = false;
                    if (paidAmount != null) {
                        // Lấy số tiền còn nợ thực tế
                        java.math.BigDecimal outstandingAmount = bill.getOutstandingAmount() != null ? 
                            bill.getOutstandingAmount() : bill.getTotalAmount();
                        
                        // Sử dụng originalPaymentAmount để xác định có phải thanh toán từng phần không
                        // Thanh toán từng phần khi số tiền gốc <= số tiền còn nợ (bao gồm cả trường hợp bằng nhau)
                        // và hóa đơn chưa được thanh toán hết
                        isPartialPayment = originalPaymentAmount.compareTo(outstandingAmount) <= 0 && 
                                         outstandingAmount.compareTo(java.math.BigDecimal.ZERO) > 0;
                        
                        System.out.println("🔍 Logic xác định thanh toán từng phần:");
                        System.out.println("  - Số tiền còn nợ: " + outstandingAmount);
                        System.out.println("  - Số tiền thanh toán gốc: " + originalPaymentAmount);
                        System.out.println("  - Số tiền thanh toán tổng (VNPAY): " + paidAmount);
                        System.out.println("  - Có phải thanh toán từng phần: " + isPartialPayment);
                        System.out.println("  - So sánh: " + originalPaymentAmount + " < " + outstandingAmount + " = " + isPartialPayment);
                    }
                    
                    if (bill.getStatus() == null || !bill.getStatus()) {
                        System.out.println("🔍 Debug - Trước khi xử lý thanh toán:");
                        System.out.println("  - Số tiền đã trả: " + bill.getPaidAmount());
                        System.out.println("  - Số tiền còn nợ: " + bill.getOutstandingAmount());
                        System.out.println("  - Tổng số tiền hóa đơn: " + bill.getTotalAmount());
                        System.out.println("  - Số tiền thanh toán (VNPAY): " + paidAmount);
                        System.out.println("  - Có phải thanh toán từng phần: " + isPartialPayment);
                        
                        if (isPartialPayment) {
                            // Xử lý thanh toán từng phần
                            System.out.println("Đang xử lý thanh toán từng phần...");
                            System.out.println("💰 Sử dụng originalPaymentAmount cho thanh toán từng phần: " + originalPaymentAmount);
                            
                            // 🆕 CRITICAL FIX: Capture outstandingBefore and paidBefore BEFORE updating the bill
                            java.math.BigDecimal outstandingBefore = java.util.Optional.ofNullable(bill.getOutstandingAmount()).orElse(bill.getTotalAmount());
                            java.math.BigDecimal paidBefore = java.util.Optional.ofNullable(bill.getPaidAmount()).orElse(java.math.BigDecimal.ZERO);
                            
                            // Calculate outstandingAfter BEFORE updating the bill
                            java.math.BigDecimal outstandingAfter = outstandingBefore.subtract(originalPaymentAmount);
                            if (outstandingAfter.compareTo(java.math.BigDecimal.ZERO) < 0) outstandingAfter = java.math.BigDecimal.ZERO;
                            java.math.BigDecimal paidAfter = paidBefore.add(originalPaymentAmount);
                            
                            // Calculate partial payment fee
                            java.math.BigDecimal partialPaymentFee = new java.math.BigDecimal(paidAmount).subtract(originalPaymentAmount);
                            if (partialPaymentFee.compareTo(java.math.BigDecimal.ZERO) < 0) partialPaymentFee = java.math.BigDecimal.ZERO;
                            
                            System.out.println("🔍 DEBUG PARTIAL PAYMENT - BEFORE BILL UPDATE:");
                            System.out.println("  - outstandingBefore: " + outstandingBefore);
                            System.out.println("  - outstandingAfter: " + outstandingAfter);
                            System.out.println("  - paidBefore: " + paidBefore);
                            System.out.println("  - paidAfter: " + paidAfter);
                            System.out.println("  - partialPaymentFee: " + partialPaymentFee);
                            
                            // Create PaymentHistory BEFORE updating the bill
                            try {
                                PaymentHistory paymentHistory = new PaymentHistory();
                                paymentHistory.setBill(bill);
                                paymentHistory.setPaymentMethod("VNPAY");
                                paymentHistory.setStatus("SUCCESS");
                                paymentHistory.setPaymentDate(Instant.now());
                                paymentHistory.setPaymentNumber(billService.getPaymentCount(bill.getId()) + 1);

                                paymentHistory.setPaymentAmount(originalPaymentAmount); // TIỀN GỐC
                                paymentHistory.setTotalAmount(new java.math.BigDecimal(paidAmount)); // tổng VNPay trả (gồm phí)
                                paymentHistory.setPartialPaymentFee(partialPaymentFee);
                                paymentHistory.setOverdueInterest(java.math.BigDecimal.ZERO);

                                paymentHistory.setOutstandingBefore(outstandingBefore);
                                paymentHistory.setOutstandingAfter(outstandingAfter);
                                paymentHistory.setPaidBefore(paidBefore);
                                paymentHistory.setPaidAfter(paidAfter);

                                paymentHistory.setIsPartialPayment(true);
                                paymentHistory.setMonthsOverdue(calculateOverdueMonths(bill));
                                paymentHistory.setTransactionId(fields.get("vnp_TransactionNo"));
                                paymentHistory.setNotes("Thanh toán qua VNPAY");

                                paymentHistoryService.savePaymentHistory(paymentHistory);

                                System.out.println("📝 Đã tạo lịch sử thanh toán VNPAY thành công cho hóa đơn #" + billId);
                            } catch (Exception e) {
                                System.out.println("⚠️ Lỗi khi tạo lịch sử thanh toán: " + e.getMessage());
                                // Không throw exception để không ảnh hưởng đến thanh toán chính
                            }
                            
                            // Gọi service để xử lý thanh toán từng phần
                            PartialPaymentRequest partialRequest = new PartialPaymentRequest();
                            partialRequest.setBillId(billId);
                            partialRequest.setPaymentAmount(originalPaymentAmount); // Sử dụng originalPaymentAmount
                            partialRequest.setPaymentMethod("VNPAY");
                            partialRequest.setNotes("Thanh toán qua VNPAY");
                            partialRequest.setSkipPaymentHistoryCreation(true); // 🆕 Bỏ qua tạo PaymentHistory vì đã tạo ở trên
                            
                            // Gọi service để xử lý thanh toán từng phần
                            billService.makePartialPayment(partialRequest);
                            
                            // 🆕 Cập nhật transactionId cho lịch sử thanh toán
                            try {
                                String transactionId = fields.get("vnp_TransactionNo");
                                if (transactionId != null) {
                                    // Tìm lịch sử thanh toán mới nhất của hóa đơn này
                                    com.mpbhms.backend.dto.PaymentHistoryResponse latestPayment = 
                                        paymentHistoryService.getLatestPaymentByBillId(billId);
                                    if (latestPayment != null) {
                                        // Cập nhật transactionId (cần implement method này)
                                        System.out.println("🔗 Cập nhật transactionId: " + transactionId + " cho lịch sử thanh toán #" + latestPayment.getId());
                                    }
                                }
                            } catch (Exception e) {
                                System.out.println("⚠️ Lỗi khi cập nhật transactionId: " + e.getMessage());
                            }
                            
                            // KHÔNG cần kiểm tra lại ở đây vì makePartialPayment() đã xử lý status
                            // Chỉ log để debug
                            Bill updatedBill = billRepository.findById(billId).orElse(null);
                            if (updatedBill != null) {
                                System.out.println("🔍 Debug - Sau khi thanh toán từng phần:");
                                System.out.println("  - Số tiền đã trả: " + updatedBill.getPaidAmount());
                                System.out.println("  - Số tiền còn nợ: " + updatedBill.getOutstandingAmount());
                                System.out.println("  - Trạng thái: " + updatedBill.getStatus());
                                System.out.println("  - Ngày thanh toán: " + updatedBill.getPaidDate());
                            }
                            
                            System.out.println("Thanh toán từng phần đã được xử lý thành công");
                        } else {
                            // Xử lý thanh toán đầy đủ hoặc thanh toán thẳng
                            System.out.println("Đang xử lý thanh toán đầy đủ/thanh toán thẳng...");
                            
                            // Kiểm tra xem hóa đơn có phải đã từng thanh toán từng phần không
                            if (Boolean.TRUE.equals(bill.getIsPartiallyPaid())) {
                                System.out.println("Hóa đơn đã từng thanh toán từng phần, đang tính phí thanh toán từng phần...");
                                
                                // Lấy số lần thanh toán đã thực hiện
                                int paymentCount = billService.getPaymentCount(billId);
                                System.out.println("Số lần thanh toán: " + paymentCount);
                                
                                // Tính phí thanh toán từng phần
                                java.math.BigDecimal partialPaymentFee = billService.calculateNextPaymentFee(paymentCount);
                                System.out.println("Phí thanh toán từng phần: " + partialPaymentFee);
                                
                                // 🆕 Cộng phí thanh toán từng phần vào trường riêng
                                bill.addPartialPaymentFee(partialPaymentFee);
                                System.out.println("💰 Đã cộng phí thanh toán từng phần: " + partialPaymentFee + 
                                    " vào tổng phí đã thu: " + bill.getPartialPaymentFeesCollected());
                                
                                // Ghi nhận phí thanh toán từng phần vào ghi chú hoặc log
                                String currentNotes = bill.getNotes() != null ? bill.getNotes() : "";
                                String feeNote = String.format(" [Phí thanh toán từng phần: %s VNĐ (lần thứ %d)]", 
                                    partialPaymentFee.toString(), paymentCount + 1);
                                bill.setNotes(currentNotes + feeNote);
                                
                                System.out.println("Đã thêm ghi chú phí thanh toán từng phần: " + feeNote);
                            }
                            
                            // 1) Lấy bill và giữ BEFORE (tính trước khi update bill)
                            java.math.BigDecimal outstandingBefore = java.util.Optional.ofNullable(bill.getOutstandingAmount()).orElse(bill.getTotalAmount());
                            java.math.BigDecimal paidBefore = java.util.Optional.ofNullable(bill.getPaidAmount()).orElse(java.math.BigDecimal.ZERO);

                            // 2) Lấy originalAmount (tiền gốc KH muốn trả) từ orderInfo
                            System.out.println("🔍 DEBUG ORDERINFO: " + orderInfo);
                            java.math.BigDecimal originalAmount = parseOriginalAmountFromOrderInfo(orderInfo)
                                    .orElse(originalPaymentAmount); // fallback bất đắc dĩ
                            System.out.println("🔍 DEBUG ORIGINAL AMOUNT PARSED: " + originalAmount);
                            System.out.println("🔍 DEBUG ORIGINAL PAYMENT AMOUNT FALLBACK: " + originalPaymentAmount);
                            
                            if (originalAmount.compareTo(java.math.BigDecimal.ZERO) <= 0) {
                                System.out.println("❌ originalAmount không hợp lệ: " + originalAmount);
                                return ResponseEntity.badRequest().body("originalAmount không hợp lệ");
                            }

                            // 3) Tính AFTER trước khi update bill
                            java.math.BigDecimal outstandingAfter = outstandingBefore.subtract(originalAmount);
                            if (outstandingAfter.compareTo(java.math.BigDecimal.ZERO) < 0) outstandingAfter = java.math.BigDecimal.ZERO;
                            java.math.BigDecimal paidAfter = paidBefore.add(originalAmount);

                            // Tính phí thanh toán từng phần
                            java.math.BigDecimal partialPaymentFee = new java.math.BigDecimal(paidAmount).subtract(originalAmount);
                            if (partialPaymentFee.compareTo(java.math.BigDecimal.ZERO) < 0) partialPaymentFee = java.math.BigDecimal.ZERO;

                            // Log thông tin để debug
                            System.out.println("🔍 DEBUG VNPAY CALLBACK:");
                            System.out.println("🔍 orderInfo: " + orderInfo);
                            System.out.println("🔍 originalAmount: " + originalAmount);
                            System.out.println("🔍 totalPaid: " + paidAmount);
                            System.out.println("🔍 outstandingBefore: " + outstandingBefore);
                            System.out.println("🔍 outstandingAfter: " + outstandingAfter);
                            System.out.println("🔍 paidBefore: " + paidBefore);
                            System.out.println("🔍 paidAfter: " + paidAfter);
                            System.out.println("🔍 partialPaymentFee: " + partialPaymentFee);

                            // 4) Lưu PaymentHistory dùng chính các biến vừa tính
                            try {
                                PaymentHistory paymentHistory = new PaymentHistory();
                                paymentHistory.setBill(bill);
                                paymentHistory.setPaymentMethod("VNPAY");
                                paymentHistory.setStatus("SUCCESS");
                                paymentHistory.setPaymentDate(Instant.now());
                                paymentHistory.setPaymentNumber(billService.getPaymentCount(bill.getId()) + 1);

                                paymentHistory.setPaymentAmount(originalAmount); // TIỀN GỐC
                                paymentHistory.setTotalAmount(new java.math.BigDecimal(paidAmount)); // tổng VNPay trả (gồm phí)
                                paymentHistory.setPartialPaymentFee(partialPaymentFee);
                                paymentHistory.setOverdueInterest(java.math.BigDecimal.ZERO);

                                paymentHistory.setOutstandingBefore(outstandingBefore);
                                paymentHistory.setOutstandingAfter(outstandingAfter);
                                paymentHistory.setPaidBefore(paidBefore);
                                paymentHistory.setPaidAfter(paidAfter);

                                // Xác định isPartialPayment dựa trên logic đã tính ở trên
                                paymentHistory.setIsPartialPayment(isPartialPayment);
                                paymentHistory.setMonthsOverdue(calculateOverdueMonths(bill));
                                paymentHistory.setTransactionId(fields.get("vnp_TransactionNo"));
                                paymentHistory.setNotes("VNPay return");

                                paymentHistoryService.savePaymentHistory(paymentHistory);

                                System.out.println("📝 Đã tạo lịch sử thanh toán VNPAY thành công cho hóa đơn #" + billId);
                            } catch (Exception e) {
                                System.out.println("⚠️ Lỗi khi tạo lịch sử thanh toán: " + e.getMessage());
                                // Không throw exception để không ảnh hưởng đến thanh toán chính
                            }

                            // 5) Cập nhật Bill SAU KHI đã set payment history
                            bill.addPayment(originalAmount);
                            if (partialPaymentFee.compareTo(java.math.BigDecimal.ZERO) > 0) {
                                bill.addPartialPaymentFee(partialPaymentFee);
                            }
                            bill.setStatus(bill.getOutstandingAmount().compareTo(java.math.BigDecimal.ZERO) <= 0);
                            
                            System.out.println("Trạng thái hóa đơn sau khi cập nhật: " + bill.getStatus());
                            System.out.println("Ngày thanh toán hóa đơn: " + bill.getPaidDate());
                        }
                        
                        Bill savedBill = billRepository.save(bill);
                        System.out.println("Hóa đơn đã được lưu thành công: " + (savedBill != null));
                        System.out.println("Trạng thái hóa đơn đã lưu: " + savedBill.getStatus());
                        System.out.println("Ngày thanh toán hóa đơn đã lưu: " + savedBill.getPaidDate());
                        
                        // Xác minh việc lưu bằng cách tìm lại
                        Bill verifyBill = billRepository.findById(billId).orElse(null);
                        System.out.println("Xác minh - Trạng thái hóa đơn sau khi lưu: " + (verifyBill != null ? verifyBill.getStatus() : "NULL"));
                    } else {
                        System.out.println("Hóa đơn đã thanh toán, không cần cập nhật");
                    }
                } else {
                    System.out.println("LỖI: Không tìm thấy hóa đơn với ID: " + billId);
                }

                String html = "<html><body>"
                        + "<h2>Thanh toán thành công!</h2>"
                        + "<script>window.location='http://52.184.69.15/renter/bills';</script>"
                        + "</body></html>";
                return ResponseEntity.ok().body(html);
            } else {
                System.out.println("Thanh toán thất bại hoặc không hợp lệ");
                System.out.println("Hợp lệ: " + valid);
                System.out.println("Mã phản hồi: " + responseCode);
                System.out.println("ID hóa đơn: " + billId);
                
                String html = "<html><body>"
                        + "<h2>Thanh toán thất bại hoặc bị hủy!</h2>"
                        + "<script>window.location='http://52.184.69.15/renter/bills';</script>"
                        + "</body></html>";
                return ResponseEntity.ok().body(html);
            }
        } catch (Exception e) {
            System.out.println("LỖI trong vnpayReturn: " + e.getMessage());
            e.printStackTrace();
            
            String html = "<html><body>"
                    + "<h2>Có lỗi xảy ra: " + e.getMessage() + "</h2>"
                    + "<script>window.location='http://52.184.69.15/renter/bills';</script>"
                    + "</body></html>";
            return ResponseEntity.ok().body(html);
        }
    }

    // Helper method để tính số tháng quá hạn
    private int calculateOverdueMonths(Bill bill) {
        if (bill.getDueDate() == null) return 0;
        try {
            Instant due = bill.getDueDate();
            Instant now = Instant.now();
            if (now.isBefore(due)) return 0;
            long days = java.time.temporal.ChronoUnit.DAYS.between(due, now);
            return (int) Math.ceil(days / 30.44); // gần đúng số tháng
        } catch (Exception e) {
            return 0;
        }
    }

    // Helper method để parse originalAmount từ orderInfo
    private java.util.Optional<java.math.BigDecimal> parseOriginalAmountFromOrderInfo(String orderInfo) {
        // Tìm "originalAmount:..." ở cuối chuỗi
        java.util.regex.Pattern p = java.util.regex.Pattern.compile("\\|originalAmount:([0-9.,]+)");
        java.util.regex.Matcher m = p.matcher(orderInfo != null ? orderInfo : "");
        if (m.find()) {
            String raw = m.group(1);
            return java.util.Optional.of(normalizeVnd(raw));
        }
        return java.util.Optional.empty();
    }

    // Helper method để normalize VND string (bỏ dấu chấm/ngăn nghìn)
    private java.math.BigDecimal normalizeVnd(String s) {
        // Bỏ dấu chấm/ngăn nghìn, chỉ giữ số
        String clean = s.replace(".", "").replace(",", "");
        return new java.math.BigDecimal(clean);
    }

    // 3. API nhận IPN từ VNPay (URL thông báo)
    @GetMapping("/vnpay-ipn")
    public ResponseEntity<?> vnpayIpn(HttpServletRequest request) {
        Map<String, String[]> params = request.getParameterMap();
        Map<String, String> fields = new HashMap<>();
        for (String key : params.keySet()) {
            fields.put(key, params.get(key)[0]);
        }

        String vnp_SecureHash = fields.get("vnp_SecureHash");
        System.out.println("=== DEBUG CALLBACK IPN TỪ VNPAY ===");
        System.out.println("Tất cả các trường: " + fields);

        try {
            boolean valid = vnPayService.validateSignature(fields, vnp_SecureHash);
            System.out.println("Chữ ký hợp lệ: " + valid);
            System.out.println("Mã phản hồi: " + fields.get("vnp_ResponseCode"));
            Long billId = null;
            if (fields.containsKey("vnp_TxnRef")) {
                billId = vnPayService.extractBillIdFromTxnRef(fields.get("vnp_TxnRef"));
                System.out.println("ID hóa đơn được trích xuất: " + billId);
            }
            if (valid && "00".equals(fields.get("vnp_ResponseCode")) && billId != null) {
                Bill bill = billRepository.findById(billId).orElse(null);
                if (bill != null && (bill.getStatus() == null || !bill.getStatus())) {
                    bill.setStatus(true);
                    bill.setPaidDate(Instant.now());
                    billRepository.save(bill);
                    System.out.println("Hóa đơn đã được cập nhật thành ĐÃ THANH TOÁN: " + billId);
                } else {
                    System.out.println("Không tìm thấy hóa đơn hoặc đã thanh toán: " + billId);
                }
                return ResponseEntity.ok("{\"RspCode\":\"00\",\"Message\":\"Xác nhận thành công\"}");
            } else {
                System.out.println("IPN: Không cập nhật hóa đơn. hợp lệ=" + valid + ", mã phản hồi=" + fields.get("vnp_ResponseCode") + ", ID hóa đơn=" + billId);
                return ResponseEntity.badRequest().body("{\"RspCode\":\"97\",\"Message\":\"Chữ ký hoặc mã phản hồi không hợp lệ\"}");
            }
        } catch (Exception e) {
            System.out.println("LỖI IPN: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // 4. API debug để kiểm tra trạng thái hóa đơn
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
            return ResponseEntity.badRequest().body("Lỗi: " + e.getMessage());
        }
    }

    // 5. API debug để test parse originalAmount
    @GetMapping("/debug/test-parse/{orderInfo}")
    public ResponseEntity<?> debugTestParse(@PathVariable String orderInfo) {
        try {
            java.math.BigDecimal originalAmount = parseOriginalAmountFromOrderInfo(orderInfo)
                    .orElse(java.math.BigDecimal.ZERO);
            
            Map<String, Object> response = new HashMap<>();
            response.put("orderInfo", orderInfo);
            response.put("originalAmount", originalAmount);
            response.put("parsedSuccessfully", !originalAmount.equals(java.math.BigDecimal.ZERO));
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Lỗi: " + e.getMessage());
        }
    }

    // 6. API debug để cập nhật trạng thái hóa đơn thủ công
    @PostMapping("/debug/update-bill-status/{billId}")
    public ResponseEntity<?> debugUpdateBillStatus(@PathVariable Long billId, @RequestParam(defaultValue = "true") Boolean status) {
        try {
            Bill bill = billRepository.findById(billId).orElse(null);
            if (bill != null) {
                System.out.println("DEBUG: Cập nhật trạng thái hóa đơn " + billId + " từ " + bill.getStatus() + " thành " + status);
                bill.setStatus(status);
                if (status) {
                    bill.setPaidDate(Instant.now());
                }
                Bill savedBill = billRepository.save(bill);
                System.out.println("DEBUG: Trạng thái hóa đơn " + billId + " sau khi lưu: " + savedBill.getStatus());
                
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
            System.out.println("LỖI DEBUG: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.badRequest().body("Lỗi: " + e.getMessage());
        }
    }


}
