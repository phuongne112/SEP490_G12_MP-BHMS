package com.mpbhms.backend.repository;

import com.mpbhms.backend.entity.PaymentHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PaymentHistoryRepository extends JpaRepository<PaymentHistory, Long> {

    /**
     * Tìm tất cả lịch sử thanh toán của một hóa đơn, sắp xếp theo ngày thanh toán (mới nhất trước)
     */
    List<PaymentHistory> findByBillIdOrderByPaymentDateDesc(Long billId);

    /**
     * Tìm tất cả lịch sử thanh toán của một hóa đơn, sắp xếp theo số thứ tự thanh toán
     */
    List<PaymentHistory> findByBillIdOrderByPaymentNumberAsc(Long billId);

    /**
     * Đếm số lần thanh toán của một hóa đơn
     */
    long countByBillId(Long billId);

    /**
     * Tìm lần thanh toán cuối cùng của một hóa đơn
     */
    @Query("SELECT ph FROM PaymentHistory ph WHERE ph.bill.id = :billId ORDER BY ph.paymentDate DESC LIMIT 1")
    PaymentHistory findLatestPaymentByBillId(@Param("billId") Long billId);

    /**
     * Tìm tất cả lịch sử thanh toán thành công của một hóa đơn
     */
    List<PaymentHistory> findByBillIdAndStatusOrderByPaymentDateDesc(Long billId, String status);

    /**
     * Tìm tất cả lịch sử thanh toán từng phần của một hóa đơn
     */
    List<PaymentHistory> findByBillIdAndIsPartialPaymentTrueOrderByPaymentDateDesc(Long billId);

    /**
     * Tìm tất cả lịch sử thanh toán trong khoảng thời gian
     */
    @Query("SELECT ph FROM PaymentHistory ph WHERE ph.paymentDate BETWEEN :startDate AND :endDate ORDER BY ph.paymentDate DESC")
    List<PaymentHistory> findByPaymentDateBetween(@Param("startDate") java.time.Instant startDate, 
                                                 @Param("endDate") java.time.Instant endDate);

    /**
     * Tìm tất cả lịch sử thanh toán theo phương thức thanh toán
     */
    List<PaymentHistory> findByPaymentMethodOrderByPaymentDateDesc(String paymentMethod);

    /**
     * Tìm tất cả lịch sử thanh toán của một phòng
     */
    @Query("SELECT ph FROM PaymentHistory ph WHERE ph.bill.room.id = :roomId ORDER BY ph.paymentDate DESC")
    List<PaymentHistory> findByRoomId(@Param("roomId") Long roomId);

    /**
     * Tìm tất cả lịch sử thanh toán của một người dùng
     */
    @Query("SELECT ph FROM PaymentHistory ph JOIN ph.bill.room.roomUsers ru WHERE ru.user.id = :userId ORDER BY ph.paymentDate DESC")
    List<PaymentHistory> findByUserId(@Param("userId") Long userId);

    /**
     * Tính tổng số tiền đã thanh toán của một hóa đơn
     */
    @Query("SELECT COALESCE(SUM(ph.paymentAmount), 0) FROM PaymentHistory ph WHERE ph.bill.id = :billId AND ph.status = 'SUCCESS'")
    java.math.BigDecimal sumPaymentAmountByBillId(@Param("billId") Long billId);

    /**
     * Tính tổng phí thanh toán từng phần của một hóa đơn
     */
    @Query("SELECT COALESCE(SUM(ph.partialPaymentFee), 0) FROM PaymentHistory ph WHERE ph.bill.id = :billId AND ph.status = 'SUCCESS'")
    java.math.BigDecimal sumPartialPaymentFeesByBillId(@Param("billId") Long billId);

    /**
     * Tính tổng lãi suất quá hạn của một hóa đơn
     */
    @Query("SELECT COALESCE(SUM(ph.overdueInterest), 0) FROM PaymentHistory ph WHERE ph.bill.id = :billId AND ph.status = 'SUCCESS'")
    java.math.BigDecimal sumOverdueInterestByBillId(@Param("billId") Long billId);

    /**
     * Tìm tất cả thanh toán tiền mặt pending của một hóa đơn
     */
    List<PaymentHistory> findByBillIdAndPaymentMethodAndStatusOrderByPaymentDateDesc(Long billId, String paymentMethod, String status);
}

