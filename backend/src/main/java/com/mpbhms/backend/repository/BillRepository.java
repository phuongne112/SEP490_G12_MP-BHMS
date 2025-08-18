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
    // Đếm số hóa đơn quá hạn (chưa thanh toán và toDate + 7 ngày < hiện tại - từ ngày thứ 7 trở đi)
    @Query("SELECT COUNT(b) FROM Bill b WHERE b.status = false AND b.toDate < :sevenDaysAgo")
    long countOverdue(@Param("sevenDaysAgo") Instant sevenDaysAgo);

    // Tổng doanh thu đã thanh toán (bao gồm cả thanh toán từng phần và phí)
    @Query("SELECT COALESCE(SUM(COALESCE(b.paidAmount, 0) + COALESCE(b.partialPaymentFeesCollected, 0)), 0) FROM Bill b WHERE COALESCE(b.paidAmount, 0) > 0")
    BigDecimal getTotalRevenue();

    // Doanh thu theo tháng (6 tháng gần nhất) - tính theo tiền thực thu
    @Query("SELECT FUNCTION('DATE_FORMAT', COALESCE(b.paidDate, b.lastPaymentDate, b.toDate), '%Y-%m') as month, " +
           "COALESCE(SUM(COALESCE(b.paidAmount, 0) + COALESCE(b.partialPaymentFeesCollected, 0)), 0) as revenue " +
           "FROM Bill b WHERE COALESCE(b.paidAmount, 0) > 0 AND COALESCE(b.paidDate, b.lastPaymentDate, b.toDate) >= :from " +
           "GROUP BY month ORDER BY month ASC")
    List<Object[]> getRevenueByMonth(@Param("from") Instant from);

    // Doanh thu tháng hiện tại - tính theo tiền thực thu
    @Query("SELECT COALESCE(SUM(COALESCE(b.paidAmount, 0) + COALESCE(b.partialPaymentFeesCollected, 0)), 0) " +
           "FROM Bill b WHERE COALESCE(b.paidAmount, 0) > 0 AND " +
           "FUNCTION('DATE_FORMAT', COALESCE(b.paidDate, b.lastPaymentDate, b.toDate), '%Y-%m') = :month")
    BigDecimal getMonthRevenue(@Param("month") String month);

    // Kiểm tra đã tồn tại hóa đơn phạt cho hóa đơn gốc
    boolean existsByOriginalBillAndBillType(Bill originalBill, BillType billType);
    
    // 🆕 Thống kê doanh thu chi tiết
    @Query("SELECT COALESCE(SUM(COALESCE(b.paidAmount, 0)), 0) FROM Bill b WHERE COALESCE(b.paidAmount, 0) > 0")
    BigDecimal getTotalBillRevenue();
    
    @Query("SELECT COALESCE(SUM(COALESCE(b.partialPaymentFeesCollected, 0)), 0) FROM Bill b WHERE COALESCE(b.partialPaymentFeesCollected, 0) > 0")
    BigDecimal getTotalFeeRevenue();
    
    @Query("SELECT COUNT(b) FROM Bill b WHERE b.isPartiallyPaid = true")
    long countPartiallyPaidBills();

    // Tìm hóa đơn quá hạn (chưa thanh toán và toDate + 7 ngày < hiện tại)
    @Query("SELECT b FROM Bill b WHERE b.status = false AND b.toDate < :sevenDaysAgo AND b.billType != 'LATE_PENALTY'")
    List<Bill> findByStatusFalseAndToDateBefore(@Param("sevenDaysAgo") Instant sevenDaysAgo);
    
    // Tìm tất cả hóa đơn chưa thanh toán (không phải hóa đơn phạt)
    @Query("SELECT b FROM Bill b WHERE b.status = false AND b.billType != 'LATE_PENALTY'")
    List<Bill> findByStatusFalse();
}