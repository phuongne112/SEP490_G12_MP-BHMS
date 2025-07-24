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

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import com.mpbhms.backend.entity.Contract;
import com.mpbhms.backend.entity.Room;

import java.math.BigDecimal;

public interface BillRepository extends JpaRepository<Bill, Long>, JpaSpecificationExecutor<Bill> {
    Page<Bill> findByContractId(Long contractId, Pageable pageable);
    Page<Bill> findByRoomId(Long roomId, Pageable pageable);

    // Thêm hàm tìm bill đầu tiên theo hợp đồng
    Optional<Bill> findFirstByContractIdAndBillType(Long contractId, BillType billType);

    // Tìm tất cả bill mà user là người thuê trong hợp đồng
    Page<Bill> findDistinctByContract_RoomUsers_User_Id(Long userId, Pageable pageable);

    // Kiểm tra hóa đơn trùng (cùng phòng, hợp đồng, loại hóa đơn, từ ngày, đến ngày)
    boolean existsByRoomAndContractAndBillTypeAndFromDateAndToDate(
        Room room,
        Contract contract,
        BillType billType,
        Instant fromDate,
        Instant toDate
    );

    // Đếm số hóa đơn chưa thanh toán
    long countByStatusFalse();
    // Đếm số hóa đơn đã thanh toán
    long countByStatusTrue();
    // Đếm số hóa đơn quá hạn (chưa thanh toán và toDate < hiện tại)
    @Query("SELECT COUNT(b) FROM Bill b WHERE b.status = false AND b.toDate < :now")
    long countOverdue(@Param("now") Instant now);

    // Tổng doanh thu đã thanh toán
    @Query("SELECT COALESCE(SUM(b.totalAmount),0) FROM Bill b WHERE b.status = true")
    BigDecimal getTotalRevenue();

    // Doanh thu theo tháng (6 tháng gần nhất)
    @Query("SELECT FUNCTION('DATE_FORMAT', b.toDate, '%Y-%m') as month, COALESCE(SUM(b.totalAmount),0) as revenue FROM Bill b WHERE b.status = true AND b.toDate >= :from GROUP BY month ORDER BY month ASC")
    List<Object[]> getRevenueByMonth(@Param("from") Instant from);

    // Doanh thu tháng hiện tại
    @Query("SELECT COALESCE(SUM(b.totalAmount),0) FROM Bill b WHERE b.status = true AND FUNCTION('DATE_FORMAT', b.toDate, '%Y-%m') = :month")
    BigDecimal getMonthRevenue(@Param("month") String month);
}
