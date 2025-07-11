package com.mpbhms.backend.repository;

import com.mpbhms.backend.entity.BillDetail;
import com.mpbhms.backend.entity.CustomService;
import com.mpbhms.backend.entity.Bill;
import com.mpbhms.backend.enums.BillType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface BillRepository extends JpaRepository<Bill, Long>, JpaSpecificationExecutor<Bill> {
    Page<Bill> findByContractId(Long contractId, Pageable pageable);
    Page<Bill> findByRoomId(Long roomId, Pageable pageable);

    // Thêm hàm tìm bill đầu tiên theo hợp đồng
    Optional<Bill> findFirstByContractIdAndBillType(Long contractId, BillType billType);

    // Tìm tất cả bill mà user là người thuê trong hợp đồng
    Page<Bill> findDistinctByContract_RoomUsers_User_Id(Long userId, Pageable pageable);
}
