package com.mpbhms.backend.service;

import com.mpbhms.backend.dto.BillResponse;
import com.mpbhms.backend.entity.Bill;
import com.mpbhms.backend.enums.BillType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import com.mpbhms.backend.dto.BillDetailResponse;
import java.time.LocalDate;
import java.util.List;
import java.math.BigDecimal;

public interface BillService {
    // Tạo bill bất kỳ theo fromDate/toDate
    Bill generateBill(Long contractId, LocalDate fromDate, LocalDate toDate, BillType billType);

    // Tạo bill đầu tiên theo hợp đồng (tự tính chu kỳ từ ContractStartDate)
    Bill generateFirstBill(Long contractId);

    Page<Bill> getBillsByContractOrRoom(Long contractId, Long roomId, Pageable pageable);
    Bill getBillById(Long billId);

    BillResponse toResponse(Bill bill);

    List<BillDetailResponse> calculateServiceBill(Long roomId, int month, int year);

    BillResponse createAndSaveServiceBill(Long roomId, int month, int year);

    void deleteBillById(Long id);

    Page<Bill> filterBills(Long roomId, Boolean status, BigDecimal minPrice, BigDecimal maxPrice, String search, Pageable pageable);

    BillResponse createCustomBill(Long roomId, String name, String description, java.math.BigDecimal amount, java.time.Instant fromDate, java.time.Instant toDate);

    byte[] generateBillPdf(Long billId);

    Page<Bill> getBillsByUserId(Long userId, Pageable pageable);
}
