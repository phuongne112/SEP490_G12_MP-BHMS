package com.mpbhms.backend.controller;

import com.mpbhms.backend.dto.BillResponse;
import com.mpbhms.backend.dto.BillDetailResponse;
import com.mpbhms.backend.entity.Bill;
import com.mpbhms.backend.enums.BillType;
import com.mpbhms.backend.service.BillService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import com.mpbhms.backend.service.EmailService;
import com.mpbhms.backend.service.VnPayService;

@RestController
@RequestMapping("/mpbhms/bills")
@RequiredArgsConstructor
public class BillController {

    private final BillService billService;
    private final EmailService emailService;
    private final VnPayService vnPayService;

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
        String subject = "Hóa đơn phòng " + bill.getRoom().getRoomNumber();
        String paymentUrl = "";
        try {
            paymentUrl = vnPayService.createPaymentUrl(bill.getId(), bill.getTotalAmount().longValue(), "Thanh toán hóa đơn #" + bill.getId());
        } catch (Exception e) {
            paymentUrl = null;
        }
        String content = "Xin chào, vui lòng xem hóa đơn đính kèm.<br>" +
                (paymentUrl != null ? ("Để thanh toán hóa đơn, vui lòng bấm vào <a href='" + paymentUrl + "'>đây</a>.<br>Hoặc copy link: " + paymentUrl) : "Không tạo được link thanh toán tự động.");
        int sent = 0;
        for (String email : emails) {
            try {
                emailService.sendBillWithAttachment(email, subject, content, pdfBytes);
                sent++;
            } catch (Exception e) {
                // Có thể log lỗi gửi từng email
            }
        }
        if (sent > 0) {
            return ResponseEntity.ok("Đã gửi email hóa đơn cho " + sent + " người thuê!");
        } else {
            return ResponseEntity.status(500).body("Không gửi được email cho người thuê nào!");
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
}
