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
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/mpbhms/bills")
@RequiredArgsConstructor
public class BillController {

    private final BillService billService;

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
    public Page<BillResponse> getMyBills(@RequestParam(defaultValue = "0") int page,
                                         @RequestParam(defaultValue = "10") int size) {
        Long userId = com.mpbhms.backend.util.SecurityUtil.getCurrentUserId();
        Pageable pageable = PageRequest.of(page, size);
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
}
