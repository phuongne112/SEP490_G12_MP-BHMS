package com.mpbhms.backend.repository;

import com.mpbhms.backend.entity.Bill;
import com.mpbhms.backend.enums.BillType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.Optional;

public interface BillRepository extends JpaRepository<Bill, Long>, JpaSpecificationExecutor<Bill> {
    Page<Bill> findByContractId(Long contractId, Pageable pageable);
    Page<Bill> findByRoomId(Long roomId, Pageable pageable);

    // Thêm hàm tìm bill đầu tiên theo hợp đồng
    Optional<Bill> findFirstByContractIdAndBillType(Long contractId, BillType billType);
}
