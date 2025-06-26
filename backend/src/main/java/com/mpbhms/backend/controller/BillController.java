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
}
