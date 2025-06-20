package com.mpbhms.backend.service;

import com.mpbhms.backend.dto.BillResponse;
import com.mpbhms.backend.entity.Bill;
import com.mpbhms.backend.enums.BillType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import com.mpbhms.backend.dto.BillDetailResponse;
import java.time.LocalDate;
import java.util.List;

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
}
