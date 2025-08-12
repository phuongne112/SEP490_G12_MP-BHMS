package com.mpbhms.backend.controller;

import com.mpbhms.backend.entity.Bill;
import com.mpbhms.backend.entity.PaymentHistory;
import com.mpbhms.backend.repository.BillRepository;
import com.mpbhms.backend.repository.PaymentHistoryRepository;
import com.mpbhms.backend.service.BillService;
import com.mpbhms.backend.service.PaymentHistoryService;
import com.mpbhms.backend.service.VnPayService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@RestController
@RequestMapping("/mpbhms/vnpay")
@RequiredArgsConstructor
public class VnPayCallbackController {

    private final VnPayService vnPayService;
    private final BillService billService;
    private final PaymentHistoryService paymentHistoryService;
    private final PaymentHistoryRepository paymentHistoryRepository;
    private final BillRepository billRepository;

    // Trả về từ trình duyệt sau khi thanh toán
    @GetMapping("/return")
    public ResponseEntity<?> vnpReturn(@RequestParam Map<String, String> params) {
        return processVnpay(params, false);
    }

    // IPN server-to-server (nếu đã đăng ký)
    @GetMapping("/ipn")
    public ResponseEntity<?> vnpIpn(@RequestParam Map<String, String> params) {
        return processVnpay(params, true);
    }

    private ResponseEntity<?> processVnpay(Map<String, String> params, boolean isIpn) {
        try {
            // 1) Validate chữ ký & trạng thái
            if (!vnPayService.validateSignature(params, "")) {
                return ResponseEntity.badRequest().body("Sai chữ ký VNPay");
            }
            String respCode = params.getOrDefault("vnp_ResponseCode", "");
            String transStatus = params.getOrDefault("vnp_TransactionStatus", "");
            if (!"00".equals(respCode) || !"00".equals(transStatus)) {
                return ResponseEntity.badRequest().body("Giao dịch không thành công");
            }

            // 2) Lấy thông tin cần thiết
            String orderInfo = params.getOrDefault("vnp_OrderInfo", "");
            String txnRef     = params.getOrDefault("vnp_TxnRef", "");
            String transNo    = params.getOrDefault("vnp_TransactionNo", ""); // dùng chống ghi trùng
            String payDateStr = params.getOrDefault("vnp_PayDate", "");       // yyyyMMddHHmmss
            String amountStr  = params.getOrDefault("vnp_Amount", "0");       // nhân 100

            // 3) Idempotent: nếu transactionNo đã tồn tại thì bỏ qua (tạm thời bỏ qua)
            // if (transNo != null && !transNo.isBlank()
            //         && paymentHistoryRepository.findByTransactionId(transNo) != null) {
            //     return ResponseEntity.ok(Map.of("message", "Đã ghi nhận giao dịch trước đó"));
            // }

            // 4) Parse số tiền & ngày thanh toán
            BigDecimal totalPaid = new BigDecimal(amountStr).divide(new BigDecimal("100"), 0, RoundingMode.HALF_UP);
            Instant paymentInstant = parseVnpPayDate(payDateStr).orElse(Instant.now());

            // 5) Tách billId & originalAmount (tiền gốc)
            Long billId = parseBillId(orderInfo).orElseGet(() -> parseBillIdFromTxnRef(txnRef).orElse(null));
            if (billId == null) return ResponseEntity.badRequest().body("Không xác định được billId");

            // 6) Lấy originalAmount (tiền gốc KH muốn trả), KHÔNG được default = outstandingBefore
            BigDecimal originalAmount = parseOriginalAmount(orderInfo)   // từ "|originalAmount:..."
                    .orElse(totalPaid);                                  // fallback bất đắc dĩ
            
            if (originalAmount.compareTo(BigDecimal.ZERO) <= 0) {
                System.out.println("❌ originalAmount không hợp lệ: " + originalAmount);
                return ResponseEntity.badRequest().body("originalAmount không hợp lệ");
            }

            // 7) Lấy bill và giữ BEFORE
            Bill bill = billService.getBillById(billId);
            BigDecimal outstandingBefore = 
                bill.getOutstandingAmount() != null ? bill.getOutstandingAmount() : bill.getTotalAmount();
            BigDecimal paidBefore = bill.getPaidAmount() != null ? bill.getPaidAmount() : BigDecimal.ZERO;

            // 8) Tính AFTER trước khi update bill
            BigDecimal outstandingAfter = outstandingBefore.subtract(originalAmount);
            if (outstandingAfter.compareTo(BigDecimal.ZERO) < 0) outstandingAfter = BigDecimal.ZERO;
            BigDecimal paidAfter = paidBefore.add(originalAmount);

            // Tính phí thanh toán từng phần
            BigDecimal partialFee = totalPaid.subtract(originalAmount).max(BigDecimal.ZERO);

            // Log thông tin để debug
            System.out.println("🔍 DEBUG VNPAY CALLBACK:");
            System.out.println("🔍 orderInfo: " + orderInfo);
            System.out.println("🔍 originalAmount: " + originalAmount);
            System.out.println("🔍 totalPaid: " + totalPaid);
            System.out.println("🔍 outstandingBefore: " + outstandingBefore);
            System.out.println("🔍 outstandingAfter: " + outstandingAfter);
            System.out.println("🔍 paidBefore: " + paidBefore);
            System.out.println("🔍 paidAfter: " + paidAfter);
            System.out.println("🔍 partialFee: " + partialFee);

            // 9) Lưu PaymentHistory dùng chính các biến vừa tính
            PaymentHistory ph = new PaymentHistory();
            ph.setBill(bill);
            ph.setPaymentMethod("VNPAY");
            ph.setStatus("SUCCESS");
            ph.setPaymentDate(paymentInstant);
            ph.setPaymentNumber(billService.getPaymentCount(bill.getId()) + 1);

            ph.setPaymentAmount(originalAmount); // TIỀN GỐC
            ph.setTotalAmount(totalPaid);        // tổng VNPay trả (gồm phí)
            ph.setPartialPaymentFee(partialFee);
            ph.setOverdueInterest(BigDecimal.ZERO);

            ph.setOutstandingBefore(outstandingBefore);
            ph.setOutstandingAfter(outstandingAfter);
            ph.setPaidBefore(paidBefore);
            ph.setPaidAfter(paidAfter);

            ph.setIsPartialPayment(originalAmount.compareTo(outstandingBefore) < 0);
            ph.setMonthsOverdue(calculateOverdueMonths(bill));
            ph.setTransactionId(transNo);
            ph.setNotes(isIpn ? "VNPay IPN" : "VNPay return");

            paymentHistoryService.savePaymentHistory(ph);

            // 10) Cập nhật Bill SAU KHI đã set ph
            bill.addPayment(originalAmount);
            BigDecimal fee = ph.getPartialPaymentFee();
            if (fee != null && fee.compareTo(BigDecimal.ZERO) > 0) bill.addPartialPaymentFee(fee);
            bill.setStatus(bill.getOutstandingAmount().compareTo(BigDecimal.ZERO) <= 0);
            billRepository.save(bill);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Đã ghi nhận thanh toán VNPay thành công",
                    "billId", bill.getId(),
                    "paymentHistoryId", ph.getId(),
                    "outstandingAfter", ph.getOutstandingAfter()
            ));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Lỗi callback VNPay: " + e.getMessage());
        }
    }

    // === Helpers ===

    private Optional<Long> parseBillId(String orderInfo) {
        // ví dụ "Thanh toán từng phần hóa đơn #123|originalAmount:456000"
        Matcher m = Pattern.compile("#(\\d+)").matcher(orderInfo);
        if (m.find()) return Optional.of(Long.parseLong(m.group(1)));
        return Optional.empty();
    }

    private Optional<Long> parseBillIdFromTxnRef(String txnRef) {
        // nếu bạn encode dạng BILL_<id>_TIMESTAMP
        Matcher m = Pattern.compile("(\\d+)").matcher(txnRef);
        if (m.find()) return Optional.of(Long.parseLong(m.group(1)));
        return Optional.empty();
    }

    private Optional<BigDecimal> parseOriginalAmount(String orderInfo) {
        // Tìm "originalAmount:..." ở cuối chuỗi
        Pattern p = Pattern.compile("\\|originalAmount:([0-9.,]+)");
        Matcher m = p.matcher(orderInfo != null ? orderInfo : "");
        if (m.find()) {
            String raw = m.group(1);
            return Optional.of(normalizeVnd(raw));
        }
        return Optional.empty();
    }

    private BigDecimal normalizeVnd(String s) {
        // Bỏ dấu chấm/ngăn nghìn, chỉ giữ số
        String clean = s.replace(".", "").replace(",", "");
        return new BigDecimal(clean);
    }

    private Optional<Instant> parseVnpPayDate(String vnpPayDate) {
        // VNPay format: yyyyMMddHHmmss (UTC+7)
        try {
            if (vnpPayDate == null || vnpPayDate.isBlank()) return Optional.empty();
            DateTimeFormatter fmt = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");
            LocalDateTime ldt = LocalDateTime.parse(vnpPayDate, fmt);
            // VNPay trả theo VN time → convert sang Instant
            ZonedDateTime zdt = ldt.atZone(ZoneId.of("Asia/Ho_Chi_Minh"));
            return Optional.of(zdt.toInstant());
        } catch (Exception e) {
            return Optional.empty();
        }
    }

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
}
