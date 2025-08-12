package com.mpbhms.backend.controller;

import com.mpbhms.backend.dto.BillResponse;
import com.mpbhms.backend.dto.BillDetailResponse;
import com.mpbhms.backend.dto.PartialPaymentRequest;
import com.mpbhms.backend.dto.PartialPaymentResponse;
import com.mpbhms.backend.entity.Bill;
import com.mpbhms.backend.entity.PaymentHistory;
import com.mpbhms.backend.enums.BillType;
import com.mpbhms.backend.service.BillService;
import com.mpbhms.backend.service.PaymentHistoryService;
import com.mpbhms.backend.repository.BillRepository;
import com.mpbhms.backend.repository.PaymentHistoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import com.mpbhms.backend.service.EmailService;
import com.mpbhms.backend.service.VnPayService;
import com.mpbhms.backend.service.NotificationService;
import com.mpbhms.backend.dto.NotificationDTO;
import com.mpbhms.backend.enums.NotificationType;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/mpbhms/bills")
@RequiredArgsConstructor
public class BillController {

    private final BillService billService;
    private final EmailService emailService;
    private final VnPayService vnPayService;
    private final NotificationService notificationService;
    private final PaymentHistoryService paymentHistoryService;
    private final BillRepository billRepository;
    private final PaymentHistoryRepository paymentHistoryRepository;

    @PostMapping("/generate-first")
    public BillResponse generateFirstBill(@RequestParam Long contractId) {
        Bill bill = billService.generateFirstBill(contractId);
        return billService.toResponse(bill);
    }

    @PostMapping("/generate")
    public BillResponse generateBill(@RequestParam Long contractId,
                                     @RequestParam String fromDate,
                                     @RequestParam String toDate,
                                     @RequestParam BillType billType) {
        LocalDate from = LocalDate.parse(fromDate);
        LocalDate to = LocalDate.parse(toDate);
        Bill bill = billService.generateBill(contractId, from, to, billType);
        return billService.toResponse(bill);
    }

    @PostMapping("/create")
    public BillResponse createBill(@RequestBody Map<String, Object> request) {
        Long roomId = Long.valueOf(request.get("roomId").toString());
        Integer month = Integer.valueOf(request.get("month").toString());
        Integer year = Integer.valueOf(request.get("year").toString());
        return billService.createAndSaveServiceBill(roomId, month, year);
    }

    @GetMapping("/{id}")
    public BillResponse getBill(@PathVariable Long id) {
        Bill bill = billService.getBillById(id);
        return billService.toResponse(bill);
    }

    @GetMapping
    public Page<BillResponse> getBills(@RequestParam(required = false) Long contractId,
                                       @RequestParam(required = false) Long roomId,
                                       @RequestParam(required = false) Boolean status,
                                       @RequestParam(required = false) BigDecimal minPrice,
                                       @RequestParam(required = false) BigDecimal maxPrice,
                                       @RequestParam(required = false) String search,
                                       @RequestParam(defaultValue = "0") int page,
                                       @RequestParam(defaultValue = "10") int size) {
        Pageable pageable = PageRequest.of(page, size);
        if (roomId != null || status != null || minPrice != null || maxPrice != null || (search != null && !search.isEmpty())) {
            return billService.filterBills(roomId, status, minPrice, maxPrice, search, pageable)
                    .map(billService::toResponse);
        }
        return billService.getBillsByContractOrRoom(contractId, roomId, pageable)
                .map(billService::toResponse);
    }

    @DeleteMapping("/{id}")
    public void deleteBill(@PathVariable Long id) {
        billService.deleteBillById(id);
    }

    @PostMapping("/service-bill")
    public BillResponse createServiceBill(@RequestParam Long roomId,
                                          @RequestParam int month,
                                          @RequestParam int year) {
        return billService.createAndSaveServiceBill(roomId, month, year);
    }

    @GetMapping("/{id}/export")
    public ResponseEntity<byte[]> exportBillPdf(@PathVariable Long id) {
        byte[] pdfBytes = billService.generateBillPdf(id);
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=bill_" + id + ".pdf")
            .contentType(MediaType.APPLICATION_PDF)
            .body(pdfBytes);
    }

    @GetMapping("/my")
    public Page<BillResponse> getMyBills(Pageable pageable) {
        Long userId = com.mpbhms.backend.util.SecurityUtil.getCurrentUserId();
        return billService.getBillsByUserId(userId, pageable).map(billService::toResponse);
    }

    @PostMapping("/custom")
    public BillResponse createCustomBill(@RequestBody Map<String, Object> request) {
        Long roomId = Long.valueOf(request.get("roomId").toString());
        String name = request.get("name").toString();
        String description = request.get("description") != null ? request.get("description").toString() : "";
        java.math.BigDecimal amount = new java.math.BigDecimal(request.get("amount").toString());

        // Xử lý fromDate/toDate nếu có
        java.time.Instant fromDate = null;
        java.time.Instant toDate = null;
        if (request.get("fromDate") != null && request.get("toDate") != null) {
            fromDate = java.time.LocalDate.parse(request.get("fromDate").toString())
                    .atStartOfDay(java.time.ZoneId.systemDefault()).toInstant();
            toDate = java.time.LocalDate.parse(request.get("toDate").toString())
                    .atTime(23, 59).atZone(java.time.ZoneId.systemDefault()).toInstant();
        }

        // Tạo Bill và BillDetail qua service (service đã xử lý đúng thứ tự và cascade)
        return billService.createCustomBill(roomId, name, description, amount, fromDate, toDate);
    }

    @PostMapping("/bulk-generate")
    public ResponseEntity<?> bulkGenerateBills() {
        try {
            List<BillResponse> generatedBills = billService.bulkGenerateBills();
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Đã tạo " + generatedBills.size() + " hóa đơn mới");
            response.put("generatedBills", generatedBills);
            response.put("count", generatedBills.size());
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "Lỗi khi tạo hóa đơn: " + e.getMessage());
            errorResponse.put("count", 0);
            
            return ResponseEntity.status(500).body(errorResponse);
        }
    }

    @PostMapping("/{billId}/send")
    public ResponseEntity<?> sendBill(@PathVariable Long billId) {
        return sendBillEmail(billId);
    }

    @PostMapping("/send-email/{billId}")
    public ResponseEntity<?> sendBillEmail(@PathVariable Long billId) {
        Bill bill = billService.getBillById(billId);
        byte[] pdfBytes = billService.generateBillPdf(billId);
        
        // Lấy email của tất cả người thuê trong hợp đồng
        List<String> emails = bill.getContract().getRoomUsers().stream()
            .filter(ru -> ru.getUser() != null && ru.getUser().getEmail() != null)
            .map(ru -> ru.getUser().getEmail())
            .distinct()
            .toList();
            
        String subject = "Hóa đơn mới - Phòng " + bill.getRoom().getRoomNumber();
        
        // Tạo payment URL
        String paymentUrl = "";
        try {
            paymentUrl = vnPayService.createPaymentUrl(bill.getId(), bill.getTotalAmount().longValue(), "Thanh toán hóa đơn #" + bill.getId());
        } catch (Exception e) {
            paymentUrl = null;
        }
        
        // Tạo nội dung email đẹp hơn
        String content = billService.buildNormalBillEmailContent(bill, paymentUrl);
        
        int sent = 0;
        int notificationsSent = 0;
        
        // Gửi email và notification cho từng người thuê
        for (var roomUser : bill.getContract().getRoomUsers()) {
            if (roomUser.getUser() != null && Boolean.TRUE.equals(roomUser.getIsActive())) {
                // Gửi email
                if (roomUser.getUser().getEmail() != null) {
                    try {
                        emailService.sendBillWithAttachment(roomUser.getUser().getEmail(), subject, content, pdfBytes);
                        sent++;
                    } catch (Exception e) {
                        // Có thể log lỗi gửi từng email
                    }
                }
                
                // Gửi notification
                try {
                    NotificationDTO notification = new NotificationDTO();
                    notification.setRecipientId(roomUser.getUser().getId());
                    notification.setTitle("Hóa đơn mới - Phòng " + bill.getRoom().getRoomNumber());
                    notification.setMessage("Bạn có hóa đơn mới #" + bill.getId() + " - Số tiền: " + 
                        bill.getTotalAmount().toString() + " VNĐ. Vui lòng kiểm tra email để xem chi tiết.");
                    notification.setType(NotificationType.ANNOUNCEMENT);
                    notification.setMetadata("{\"billId\":" + bill.getId() + ",\"roomNumber\":\"" + bill.getRoom().getRoomNumber() + "\"}");
                    notificationService.createAndSend(notification);
                    notificationsSent++;
                } catch (Exception e) {
                    // Có thể log lỗi gửi notification
                }
            }
        }
        
        if (sent > 0 || notificationsSent > 0) {
            return ResponseEntity.ok("Đã gửi email hóa đơn cho " + sent + " người thuê và " + notificationsSent + " thông báo!");
        } else {
            return ResponseEntity.status(500).body("Không gửi được email hoặc thông báo cho người thuê nào!");
        }
    }

    @GetMapping("/dashboard-stats")
    public Map<String, Object> getBillDashboardStats() {
        long unpaid = billService.countUnpaid();
        long paid = billService.countPaid();
        long overdue = billService.countOverdue();
        BigDecimal revenue = billService.getTotalRevenue();
        var revenueByMonth = billService.getRevenueByMonth(6);
        String thisMonth = java.time.LocalDate.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyy-MM"));
        BigDecimal monthRevenue = billService.getMonthRevenue(thisMonth);
        return Map.of(
            "unpaid", unpaid,
            "paid", paid,
            "overdue", overdue,
            "revenue", revenue,
            "revenueByMonth", revenueByMonth,
            "monthRevenue", monthRevenue
        );
    }

    @PutMapping("/{id}/payment-status")
    public BillResponse updatePaymentStatus(@PathVariable Long id, @RequestBody Map<String, Object> request) {
        Boolean status = Boolean.valueOf(request.get("status").toString());
        return billService.updatePaymentStatus(id, status);
    }
    
    @PostMapping("/partial-payment")
    public ResponseEntity<?> makePartialPayment(@RequestBody PartialPaymentRequest request) {
        try {
            // Kiểm tra thanh toán tối thiểu 50% và tối đa là số tiền còn nợ
            Bill bill = billService.getBillById(request.getBillId());
            BigDecimal totalAmount = bill.getTotalAmount();
            BigDecimal outstandingAmount = bill.getOutstandingAmount() != null ? bill.getOutstandingAmount() : totalAmount;
            BigDecimal minPaymentAmount = outstandingAmount.multiply(new BigDecimal("0.5"));
            
            if (request.getPaymentAmount().compareTo(minPaymentAmount) < 0) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("success", false);
                errorResponse.put("message", "Số tiền thanh toán phải tối thiểu 50% giá trị hóa đơn (" + 
                    minPaymentAmount.toPlainString() + " VNĐ)");
                return ResponseEntity.badRequest().body(errorResponse);
            }
            
            if (request.getPaymentAmount().compareTo(outstandingAmount) > 0) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("success", false);
                errorResponse.put("message", "Số tiền thanh toán không được vượt quá số tiền còn nợ (" + 
                    outstandingAmount.toPlainString() + " VNĐ)");
                return ResponseEntity.badRequest().body(errorResponse);
            }
            
            PartialPaymentResponse response = billService.makePartialPayment(request);
            
            Map<String, Object> result = new HashMap<>();
            result.put("success", true);
            result.put("message", response.getMessage());
            result.put("data", response);
            
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "Lỗi khi thanh toán từng phần: " + e.getMessage());
            
            return ResponseEntity.status(500).body(errorResponse);
        }
    }

    @GetMapping("/{billId}/interest")
    public ResponseEntity<?> getBillInterest(@PathVariable Long billId) {
        try {
            Bill bill = billService.getBillById(billId);
            if (bill == null) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("success", false);
                errorResponse.put("message", "Không tìm thấy hóa đơn");
                return ResponseEntity.notFound().build();
            }
            
            // Tính lãi suất hiện tại
            Instant currentDate = Instant.now();
            Instant dueDate = bill.getDueDate() != null ? bill.getDueDate() : 
                bill.getToDate().plusSeconds(7 * 24 * 60 * 60);
            
            BigDecimal outstandingAmount = bill.getOutstandingAmount() != null ? 
                bill.getOutstandingAmount() : bill.getTotalAmount();
            
            // Sử dụng InterestCalculationService để tính lãi
            com.mpbhms.backend.service.InterestCalculationService interestService = 
                new com.mpbhms.backend.service.impl.InterestCalculationServiceImpl();
            
            BigDecimal interestAmount = interestService.calculateInterest(
                outstandingAmount, dueDate, currentDate);
            int monthsOverdue = interestService.calculateMonthsOverdue(dueDate, currentDate);
            
            Map<String, Object> result = new HashMap<>();
            result.put("success", true);
            result.put("billId", billId);
            result.put("outstandingAmount", outstandingAmount);
            result.put("interestAmount", interestAmount);
            result.put("monthsOverdue", monthsOverdue);
            result.put("dueDate", dueDate);
            result.put("currentDate", currentDate);
            
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "Lỗi khi tính lãi suất: " + e.getMessage());
            return ResponseEntity.status(500).body(errorResponse);
        }
    }

    @PostMapping("/partial-payment/vnpay")
    public ResponseEntity<?> createPartialPaymentVnPayUrl(@RequestBody PartialPaymentRequest request) {
        try {
            // Kiểm tra thanh toán tối thiểu 50% và tối đa là số tiền còn nợ
            Bill bill = billService.getBillById(request.getBillId());
            BigDecimal totalAmount = bill.getTotalAmount();
            BigDecimal outstandingAmount = bill.getOutstandingAmount() != null ? bill.getOutstandingAmount() : totalAmount;
            BigDecimal minPaymentAmount = outstandingAmount.multiply(new BigDecimal("0.5"));
            
            // Lấy số tiền gốc (không bao gồm phí) từ request
            BigDecimal originalPaymentAmount = request.getOriginalPaymentAmount() != null ? 
                request.getOriginalPaymentAmount() : request.getPaymentAmount();
            
            if (originalPaymentAmount.compareTo(minPaymentAmount) < 0) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("success", false);
                errorResponse.put("message", "Số tiền thanh toán phải tối thiểu 50% giá trị hóa đơn (" + 
                    minPaymentAmount.toPlainString() + " VNĐ)");
                return ResponseEntity.badRequest().body(errorResponse);
            }
            
            if (originalPaymentAmount.compareTo(outstandingAmount) > 0) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("success", false);
                errorResponse.put("message", "Số tiền thanh toán không được vượt quá số tiền còn nợ (" + 
                    outstandingAmount.toPlainString() + " VNĐ)");
                return ResponseEntity.badRequest().body(errorResponse);
            }
            
            // Đảm bảo số tiền là số dương
            BigDecimal paymentAmount = request.getPaymentAmount();
            if (paymentAmount.compareTo(BigDecimal.ZERO) <= 0) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("success", false);
                errorResponse.put("message", "Số tiền thanh toán phải lớn hơn 0");
                return ResponseEntity.badRequest().body(errorResponse);
            }
            
            // Tạo URL VNPAY cho thanh toán từng phần
            // Thêm originalPaymentAmount vào orderInfo để truyền qua VNPAY callback
            String orderInfo = "Thanh toán từng phần hóa đơn #" + request.getBillId() + 
                "|originalAmount:" + originalPaymentAmount.toPlainString();
            String paymentUrl = vnPayService.createPaymentUrl(
                request.getBillId(), 
                paymentAmount.longValue(), 
                orderInfo
            );
            
            Map<String, Object> result = new HashMap<>();
            result.put("success", true);
            result.put("message", "Đã tạo link thanh toán VNPAY thành công");
            result.put("paymentUrl", paymentUrl);
            result.put("billId", request.getBillId());
            result.put("paymentAmount", request.getPaymentAmount());
            
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "Lỗi khi tạo link thanh toán VNPAY: " + e.getMessage());
            
            return ResponseEntity.status(500).body(errorResponse);
        }
    }

    @PostMapping("/{id}/create-penalty")
    public ResponseEntity<?> createLatePenaltyBill(@PathVariable Long id) {
        try {
            // ⚠️ VALIDATION: Kiểm tra xem hóa đơn có phải là hóa đơn phạt không
            Bill originalBill = billService.getBillById(id);
            if (originalBill.getBillType() == BillType.LATE_PENALTY) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("success", false);
                errorResponse.put("message", "Không thể tạo phạt cho hóa đơn phạt. Chỉ có thể tạo phạt cho hóa đơn gốc.");
                return ResponseEntity.badRequest().body(errorResponse);
            }
            
            BillResponse penaltyBill = billService.createLatePenaltyBill(id);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Đã tạo hóa đơn phạt thành công");
            response.put("penaltyBill", penaltyBill);
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "Lỗi khi tạo hóa đơn phạt: " + e.getMessage());
            
            return ResponseEntity.status(500).body(errorResponse);
        }
    }

    @PostMapping("/check-and-create-penalties")
    public ResponseEntity<?> checkAndCreateLatePenalties() {
        try {
            List<BillResponse> createdPenalties = billService.checkAndCreateLatePenalties();
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Đã tạo " + createdPenalties.size() + " hóa đơn phạt");
            response.put("createdPenalties", createdPenalties);
            response.put("count", createdPenalties.size());
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "Lỗi khi kiểm tra và tạo phạt: " + e.getMessage());
            errorResponse.put("count", 0);
            
            return ResponseEntity.status(500).body(errorResponse);
        }
    }

    @PostMapping("/{billId}/send-overdue-warning")
    public ResponseEntity<?> sendOverdueWarning(@PathVariable Long billId) {
        try {
            Bill bill = billService.getBillById(billId);
            
            // Kiểm tra hóa đơn có quá hạn không
            if (bill.getStatus()) {
                return ResponseEntity.badRequest().body("Hóa đơn đã thanh toán, không cần gửi cảnh báo quá hạn");
            }
            
            // Gọi service để gửi thông báo cảnh báo
            billService.sendOverdueWarningNotification(bill);
            
            return ResponseEntity.ok("Đã gửi thông báo cảnh báo quá hạn thành công");
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Lỗi khi gửi thông báo cảnh báo: " + e.getMessage());
        }
    }
    
    /**
     * API để chạy thủ công job kiểm tra và tạo phạt quá hạn
     * Chỉ dành cho ADMIN và LANDLORD
     */
    @PostMapping("/run-late-penalty-check")
    public ResponseEntity<?> runLatePenaltyCheck() {
        try {
            List<BillResponse> createdPenalties = billService.checkAndCreateLatePenalties();
            
            if (!createdPenalties.isEmpty()) {
                return ResponseEntity.ok("✅ Đã tạo " + createdPenalties.size() + " hóa đơn phạt tự động. Chi tiết: " + 
                    createdPenalties.stream()
                        .map(p -> "Hóa đơn phạt #" + p.getId() + " cho hóa đơn gốc #" + p.getOriginalBillId() + " - " + p.getTotalAmount() + " VNĐ")
                        .collect(java.util.stream.Collectors.joining(", ")));
            } else {
                return ResponseEntity.ok("ℹ️ Không có hóa đơn nào cần tạo phạt");
            }
        } catch (Exception e) {
            return ResponseEntity.status(500).body("❌ Lỗi khi chạy job kiểm tra phạt: " + e.getMessage());
        }
    }
    
    /**
     * API để xem danh sách hóa đơn quá hạn hiện tại
     */
    @GetMapping("/overdue-bills")
    public List<BillResponse> getOverdueBills() {
        return billService.getOverdueBills().stream()
                .map(billService::toResponse)
                .toList();
    }

    // Lấy số lần thanh toán đã thực hiện cho một hóa đơn
    @GetMapping("/{id}/payment-count")
    public Map<String, Object> getPaymentCount(@PathVariable Long id) {
        int paymentCount = billService.getPaymentCount(id);
        return Map.of(
            "billId", id,
            "paymentCount", paymentCount,
            "nextPaymentFee", billService.calculateNextPaymentFee(paymentCount)
        );
    }

    @PostMapping("/cash-partial-payment")
    public ResponseEntity<?> createCashPartialPayment(@RequestBody PartialPaymentRequest request) {
        try {
            // Validate request
            if (request.getOriginalPaymentAmount() == null || request.getOriginalPaymentAmount().compareTo(BigDecimal.ZERO) <= 0) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("success", false);
                errorResponse.put("message", "Số tiền thanh toán phải lớn hơn 0");
                return ResponseEntity.badRequest().body(errorResponse);
            }

            Bill bill = billService.getBillById(request.getBillId());
            if (bill == null) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("success", false);
                errorResponse.put("message", "Không tìm thấy hóa đơn");
                return ResponseEntity.notFound().build();
            }

            // Validate min/max payment amount
            BigDecimal outstandingAmount = bill.getOutstandingAmount();
            BigDecimal minPayment = outstandingAmount.multiply(new BigDecimal("0.5")); // 50%
            BigDecimal maxPayment = outstandingAmount;

            if (request.getOriginalPaymentAmount().compareTo(minPayment) < 0) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("success", false);
                errorResponse.put("message", "Số tiền thanh toán tối thiểu là " + minPayment.toPlainString() + " VNĐ");
                return ResponseEntity.badRequest().body(errorResponse);
            }

            if (request.getOriginalPaymentAmount().compareTo(maxPayment) > 0) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("success", false);
                errorResponse.put("message", "Số tiền thanh toán tối đa là " + maxPayment.toPlainString() + " VNĐ");
                return ResponseEntity.badRequest().body(errorResponse);
            }

            // Create payment history record for cash payment (pending status)
            PaymentHistory paymentHistory = new PaymentHistory();
            paymentHistory.setBill(bill);
            paymentHistory.setPaymentAmount(request.getOriginalPaymentAmount());
            paymentHistory.setTotalAmount(request.getTotalWithFees());
            paymentHistory.setPartialPaymentFee(request.getPartialPaymentFee());
            paymentHistory.setOverdueInterest(request.getOverdueInterest());
            paymentHistory.setPaymentMethod("CASH");
            paymentHistory.setPaymentNumber(billService.getPaymentCount(bill.getId()) + 1);
            paymentHistory.setPaymentDate(Instant.now());
            // Tính toán thông tin trước/sau thanh toán
            BigDecimal outstandingBefore = bill.getOutstandingAmount();
            BigDecimal paidBefore = bill.getPaidAmount() != null ? bill.getPaidAmount() : BigDecimal.ZERO;
            BigDecimal outstandingAfter = outstandingBefore.subtract(request.getOriginalPaymentAmount());
            BigDecimal paidAfter = paidBefore.add(request.getOriginalPaymentAmount());
            
            // Đảm bảo số tiền nợ sau không âm
            if (outstandingAfter.compareTo(BigDecimal.ZERO) < 0) {
                outstandingAfter = BigDecimal.ZERO;
            }
            
            paymentHistory.setOutstandingBefore(outstandingBefore);
            paymentHistory.setOutstandingAfter(outstandingAfter);
            paymentHistory.setPaidBefore(paidBefore);
            paymentHistory.setPaidAfter(paidAfter);
            paymentHistory.setStatus("PENDING");
            paymentHistory.setIsPartialPayment(request.getOriginalPaymentAmount().compareTo(bill.getOutstandingAmount()) < 0);
            paymentHistory.setNotes("Thanh toán tiền mặt - chờ landlord xác nhận");
            paymentHistory.setMonthsOverdue(calculateOverdueMonths(bill));

            // Log thông tin thanh toán (giống VNPAY)
            System.out.println("=== TẠO YÊU CẦU THANH TOÁN TIỀN MẶT ===");
            System.out.println("ID hóa đơn: " + bill.getId());
            System.out.println("Số tiền thanh toán (gốc): " + request.getOriginalPaymentAmount());
            System.out.println("Phí thanh toán từng phần: " + request.getPartialPaymentFee());
            System.out.println("Lãi suất quá hạn: " + request.getOverdueInterest());
            System.out.println("Tổng cộng: " + request.getTotalWithFees());
            System.out.println("Có phải thanh toán từng phần: " + (request.getOriginalPaymentAmount().compareTo(bill.getOutstandingAmount()) < 0));
            System.out.println("Số tháng quá hạn: " + calculateOverdueMonths(bill));
            System.out.println("Ngày thanh toán khi tạo: " + paymentHistory.getPaymentDate());
            System.out.println("Số tiền nợ trước: " + outstandingBefore);
            System.out.println("Số tiền nợ sau: " + outstandingAfter);
            System.out.println("Số tiền đã trả trước: " + paidBefore);
            System.out.println("Số tiền đã trả sau: " + paidAfter);

            paymentHistoryService.savePaymentHistory(paymentHistory);

            Map<String, Object> result = new HashMap<>();
            result.put("success", true);
            result.put("message", "Đã tạo yêu cầu thanh toán tiền mặt. Chờ landlord xác nhận.");
            result.put("paymentHistoryId", paymentHistory.getId());
            
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "Lỗi khi tạo yêu cầu thanh toán tiền mặt: " + e.getMessage());
            return ResponseEntity.status(500).body(errorResponse);
        }
    }

    @PostMapping("/{billId}/confirm-cash-payment/{paymentHistoryId}")
    public ResponseEntity<?> confirmCashPayment(@PathVariable Long billId, @PathVariable Long paymentHistoryId) {
        try {
            // Tìm payment history record
            PaymentHistory paymentHistory = paymentHistoryService.getPaymentHistoryById(paymentHistoryId);
            if (paymentHistory == null) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("success", false);
                errorResponse.put("message", "Không tìm thấy yêu cầu thanh toán tiền mặt");
                return ResponseEntity.notFound().build();
            }

            // Kiểm tra xem có phải là thanh toán tiền mặt pending không
            if (!"CASH".equals(paymentHistory.getPaymentMethod()) || !"PENDING".equals(paymentHistory.getStatus())) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("success", false);
                errorResponse.put("message", "Yêu cầu thanh toán không hợp lệ");
                return ResponseEntity.badRequest().body(errorResponse);
            }

            // Kiểm tra xem có phải là hóa đơn đúng không
            if (!billId.equals(paymentHistory.getBill().getId())) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("success", false);
                errorResponse.put("message", "Hóa đơn không khớp");
                return ResponseEntity.badRequest().body(errorResponse);
            }

            Bill bill = paymentHistory.getBill();

            // Cập nhật trạng thái payment history thành SUCCESS và cập nhật ngày thanh toán
            paymentHistory.setStatus("SUCCESS");
            paymentHistory.setPaymentDate(Instant.now()); // Cập nhật ngày thanh toán khi xác nhận
            paymentHistory.setNotes("Thanh toán tiền mặt đã được landlord xác nhận");
            paymentHistoryService.savePaymentHistory(paymentHistory);

            // Cập nhật hóa đơn (giống logic VNPAY)
            BigDecimal originalPaymentAmount = paymentHistory.getPaymentAmount();
            BigDecimal partialPaymentFee = paymentHistory.getPartialPaymentFee();

            // Cập nhật paidAmount (chỉ tiền gốc)
            bill.addPayment(originalPaymentAmount);

            // Cập nhật phí thanh toán từng phần đã thu
            if (partialPaymentFee != null && partialPaymentFee.compareTo(BigDecimal.ZERO) > 0) {
                bill.addPartialPaymentFee(partialPaymentFee);
            }

            // Cập nhật trạng thái hóa đơn
            if (bill.getOutstandingAmount().compareTo(BigDecimal.ZERO) <= 0) {
                bill.setStatus(true); // Đã thanh toán hoàn toàn
            } else {
                bill.setStatus(false); // Vẫn còn nợ
            }

            // Lưu hóa đơn
            billRepository.save(bill);

            // Log thông tin xác nhận
            System.out.println("=== XÁC NHẬN THANH TOÁN TIỀN MẶT ===");
            System.out.println("ID hóa đơn: " + bill.getId());
            System.out.println("ID payment history: " + paymentHistory.getId());
            System.out.println("Số tiền thanh toán (gốc): " + originalPaymentAmount);
            System.out.println("Phí thanh toán từng phần: " + partialPaymentFee);
            System.out.println("Ngày thanh toán trước khi cập nhật: " + paymentHistory.getPaymentDate());
            System.out.println("Ngày thanh toán sau khi cập nhật: " + Instant.now());
            System.out.println("Trạng thái hóa đơn sau khi xác nhận: " + (bill.getStatus() ? "Đã thanh toán" : "Còn nợ"));
            System.out.println("Số tiền còn nợ: " + bill.getOutstandingAmount());

            Map<String, Object> result = new HashMap<>();
            result.put("success", true);
            result.put("message", "Đã xác nhận thanh toán tiền mặt thành công");
            result.put("billId", bill.getId());
            result.put("paymentHistoryId", paymentHistory.getId());
            
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "Lỗi khi xác nhận thanh toán tiền mặt: " + e.getMessage());
            return ResponseEntity.status(500).body(errorResponse);
        }
    }

    @GetMapping("/{billId}/debug-payment-history")
    public ResponseEntity<?> debugPaymentHistory(@PathVariable Long billId) {
        try {
            // Lấy trực tiếp từ database
            List<PaymentHistory> paymentHistories = paymentHistoryRepository.findByBillIdOrderByPaymentDateDesc(billId);
            
            Map<String, Object> debugInfo = new HashMap<>();
            debugInfo.put("billId", billId);
            debugInfo.put("paymentHistories", paymentHistories.stream().map(ph -> {
                Map<String, Object> phInfo = new HashMap<>();
                phInfo.put("id", ph.getId());
                phInfo.put("paymentDate", ph.getPaymentDate());
                phInfo.put("status", ph.getStatus());
                phInfo.put("paymentMethod", ph.getPaymentMethod());
                phInfo.put("outstandingBefore", ph.getOutstandingBefore());
                phInfo.put("outstandingAfter", ph.getOutstandingAfter());
                phInfo.put("paidBefore", ph.getPaidBefore());
                phInfo.put("paidAfter", ph.getPaidAfter());
                return phInfo;
            }).collect(Collectors.toList()));
            
            return ResponseEntity.ok(debugInfo);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "Lỗi khi debug payment history: " + e.getMessage());
            return ResponseEntity.status(500).body(errorResponse);
        }
    }

    @PostMapping("/{billId}/test-cash-payment")
    public ResponseEntity<?> testCashPayment(@PathVariable Long billId) {
        try {
            Bill bill = billService.getBillById(billId);
            if (bill == null) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("success", false);
                errorResponse.put("message", "Không tìm thấy hóa đơn");
                return ResponseEntity.notFound().build();
            }

            // Tạo yêu cầu thanh toán tiền mặt test
            PartialPaymentRequest request = new PartialPaymentRequest();
            request.setOriginalPaymentAmount(bill.getOutstandingAmount().multiply(new BigDecimal("0.5"))); // 50% số tiền còn nợ
            request.setPartialPaymentFee(new BigDecimal("200000")); // 200.000 VNĐ
            request.setOverdueInterest(BigDecimal.ZERO);
            request.setTotalWithFees(request.getOriginalPaymentAmount().add(request.getPartialPaymentFee()));

            // Tạo payment history
            PaymentHistory paymentHistory = new PaymentHistory();
            paymentHistory.setBill(bill);
            paymentHistory.setPaymentAmount(request.getOriginalPaymentAmount());
            paymentHistory.setTotalAmount(request.getTotalWithFees());
            paymentHistory.setPartialPaymentFee(request.getPartialPaymentFee());
            paymentHistory.setOverdueInterest(request.getOverdueInterest());
            paymentHistory.setPaymentMethod("CASH");
            paymentHistory.setPaymentNumber(billService.getPaymentCount(bill.getId()) + 1);
            paymentHistory.setPaymentDate(Instant.now());
            
            // Tính toán thông tin trước/sau thanh toán
            BigDecimal outstandingBefore = bill.getOutstandingAmount();
            BigDecimal paidBefore = bill.getPaidAmount() != null ? bill.getPaidAmount() : BigDecimal.ZERO;
            BigDecimal outstandingAfter = outstandingBefore.subtract(request.getOriginalPaymentAmount());
            BigDecimal paidAfter = paidBefore.add(request.getOriginalPaymentAmount());
            
            // Đảm bảo số tiền nợ sau không âm
            if (outstandingAfter.compareTo(BigDecimal.ZERO) < 0) {
                outstandingAfter = BigDecimal.ZERO;
            }
            
            paymentHistory.setOutstandingBefore(outstandingBefore);
            paymentHistory.setOutstandingAfter(outstandingAfter);
            paymentHistory.setPaidBefore(paidBefore);
            paymentHistory.setPaidAfter(paidAfter);
            paymentHistory.setStatus("SUCCESS"); // Set thành SUCCESS ngay lập tức cho test
            paymentHistory.setIsPartialPayment(request.getOriginalPaymentAmount().compareTo(bill.getOutstandingAmount()) < 0);
            paymentHistory.setNotes("Test thanh toán tiền mặt");
            paymentHistory.setMonthsOverdue(calculateOverdueMonths(bill));

            // Log thông tin test
            System.out.println("=== TEST THANH TOÁN TIỀN MẶT ===");
            System.out.println("ID hóa đơn: " + bill.getId());
            System.out.println("Số tiền thanh toán (gốc): " + request.getOriginalPaymentAmount());
            System.out.println("Phí thanh toán từng phần: " + request.getPartialPaymentFee());
            System.out.println("Tổng cộng: " + request.getTotalWithFees());
            System.out.println("Ngày thanh toán: " + paymentHistory.getPaymentDate());
            System.out.println("Số tiền nợ trước: " + outstandingBefore);
            System.out.println("Số tiền nợ sau: " + outstandingAfter);
            System.out.println("Số tiền đã trả trước: " + paidBefore);
            System.out.println("Số tiền đã trả sau: " + paidAfter);

            PaymentHistory saved = paymentHistoryService.savePaymentHistory(paymentHistory);

            Map<String, Object> result = new HashMap<>();
            result.put("success", true);
            result.put("message", "Đã tạo test thanh toán tiền mặt thành công");
            result.put("paymentHistoryId", saved.getId());
            result.put("paymentDate", saved.getPaymentDate());
            result.put("outstandingAfter", saved.getOutstandingAfter());
            
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "Lỗi khi tạo test thanh toán tiền mặt: " + e.getMessage());
            return ResponseEntity.status(500).body(errorResponse);
        }
    }

    @PostMapping("/{billId}/test-vnpay-payment")
    public ResponseEntity<?> testVnpayPayment(@PathVariable Long billId) {
        try {
            Bill bill = billService.getBillById(billId);
            if (bill == null) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("success", false);
                errorResponse.put("message", "Không tìm thấy hóa đơn");
                return ResponseEntity.notFound().build();
            }

            // Lưu thông tin trước khi cập nhật bill để tính toán chính xác
            BigDecimal outstandingBefore = bill.getOutstandingAmount();
            BigDecimal paidBefore = bill.getPaidAmount() != null ? bill.getPaidAmount() : BigDecimal.ZERO;
            BigDecimal originalPaymentAmount = outstandingBefore.multiply(new BigDecimal("0.3")); // 30% số tiền còn nợ
            BigDecimal outstandingAfter = outstandingBefore.subtract(originalPaymentAmount);
            BigDecimal paidAfter = paidBefore.add(originalPaymentAmount);
            
            // Đảm bảo số tiền nợ sau không âm
            if (outstandingAfter.compareTo(BigDecimal.ZERO) < 0) {
                outstandingAfter = BigDecimal.ZERO;
            }

            // Log thông tin test
            System.out.println("=== TEST THANH TOÁN VNPAY ===");
            System.out.println("ID hóa đơn: " + bill.getId());
            System.out.println("Số tiền thanh toán (gốc): " + originalPaymentAmount);
            System.out.println("Outstanding Before: " + outstandingBefore);
            System.out.println("Outstanding After: " + outstandingAfter);
            System.out.println("Paid Before: " + paidBefore);
            System.out.println("Paid After: " + paidAfter);

            // Tạo payment history với thông tin đã tính toán trước
            PaymentHistory paymentHistory = new PaymentHistory();
            paymentHistory.setBill(bill);
            paymentHistory.setPaymentAmount(originalPaymentAmount);
            paymentHistory.setTotalAmount(originalPaymentAmount.add(new BigDecimal("1000000"))); // Thêm phí 1M
            paymentHistory.setPartialPaymentFee(new BigDecimal("1000000"));
            paymentHistory.setOverdueInterest(BigDecimal.ZERO);
            paymentHistory.setPaymentMethod("VNPAY");
            paymentHistory.setPaymentNumber(billService.getPaymentCount(bill.getId()) + 1);
            paymentHistory.setPaymentDate(Instant.now());
            paymentHistory.setOutstandingBefore(outstandingBefore);
            paymentHistory.setOutstandingAfter(outstandingAfter);
            paymentHistory.setPaidBefore(paidBefore);
            paymentHistory.setPaidAfter(paidAfter);
            paymentHistory.setStatus("SUCCESS");
            paymentHistory.setIsPartialPayment(originalPaymentAmount.compareTo(outstandingBefore) < 0);
            paymentHistory.setNotes("Test thanh toán VNPAY");
            paymentHistory.setTransactionId("TEST_VNPAY_" + System.currentTimeMillis());

            // Lưu payment history
            PaymentHistory saved = paymentHistoryService.savePaymentHistory(paymentHistory);

            Map<String, Object> result = new HashMap<>();
            result.put("success", true);
            result.put("message", "Đã tạo test thanh toán VNPAY thành công");
            result.put("paymentHistoryId", saved.getId());
            result.put("paymentDate", saved.getPaymentDate());
            result.put("outstandingAfter", saved.getOutstandingAfter());
            result.put("outstandingBefore", saved.getOutstandingBefore());
            
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "Lỗi khi tạo test thanh toán VNPAY: " + e.getMessage());
            return ResponseEntity.status(500).body(errorResponse);
        }
    }

    private int calculateOverdueMonths(Bill bill) {
        if (bill.getDueDate() == null) return 0;
        
        try {
            Instant dueDate = bill.getDueDate();
            Instant now = Instant.now();
            
            if (now.isBefore(dueDate)) return 0;
            
            // Tính số tháng quá hạn chính xác hơn (giống VNPAY)
            long daysOverdue = java.time.temporal.ChronoUnit.DAYS.between(dueDate, now);
            return (int) Math.ceil(daysOverdue / 30.44); // Sử dụng 30.44 ngày/tháng
        } catch (Exception e) {
            System.err.println("Lỗi khi tính số tháng quá hạn: " + e.getMessage());
            return 0;
        }
    }
}
