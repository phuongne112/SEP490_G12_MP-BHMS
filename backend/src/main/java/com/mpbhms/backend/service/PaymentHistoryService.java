package com.mpbhms.backend.service;

import com.mpbhms.backend.dto.PaymentHistoryResponse;
import com.mpbhms.backend.entity.PaymentHistory;

import java.time.Instant;
import java.util.List;

public interface PaymentHistoryService {

    /**
     * Lưu lịch sử thanh toán
     */
    PaymentHistory savePaymentHistory(PaymentHistory paymentHistory);

    /**
     * Lấy tất cả lịch sử thanh toán của một hóa đơn
     */
    List<PaymentHistoryResponse> getPaymentHistoryByBillId(Long billId);

    /**
     * Lấy lịch sử thanh toán của một hóa đơn với phân trang
     */
    List<PaymentHistoryResponse> getPaymentHistoryByBillId(Long billId, int page, int size);

    /**
     * Lấy lịch sử thanh toán của một phòng
     */
    List<PaymentHistoryResponse> getPaymentHistoryByRoomId(Long roomId);

    /**
     * Lấy lịch sử thanh toán của một người dùng
     */
    List<PaymentHistoryResponse> getPaymentHistoryByUserId(Long userId);

    /**
     * Lấy lịch sử thanh toán trong khoảng thời gian
     */
    List<PaymentHistoryResponse> getPaymentHistoryByDateRange(Instant startDate, Instant endDate);

    /**
     * Lấy lịch sử thanh toán theo phương thức thanh toán
     */
    List<PaymentHistoryResponse> getPaymentHistoryByPaymentMethod(String paymentMethod);

    /**
     * Lấy lịch sử thanh toán từng phần của một hóa đơn
     */
    List<PaymentHistoryResponse> getPartialPaymentHistoryByBillId(Long billId);

    /**
     * Lấy lần thanh toán cuối cùng của một hóa đơn
     */
    PaymentHistoryResponse getLatestPaymentByBillId(Long billId);

    /**
     * Đếm số lần thanh toán của một hóa đơn
     */
    long countPaymentsByBillId(Long billId);

    /**
     * Tính tổng số tiền đã thanh toán của một hóa đơn
     */
    java.math.BigDecimal getTotalPaidAmountByBillId(Long billId);

    /**
     * Tính tổng phí thanh toán từng phần của một hóa đơn
     */
    java.math.BigDecimal getTotalPartialPaymentFeesByBillId(Long billId);

    /**
     * Tính tổng lãi suất quá hạn của một hóa đơn
     */
    java.math.BigDecimal getTotalOverdueInterestByBillId(Long billId);

    /**
     * Tạo lịch sử thanh toán từ thông tin thanh toán
     */
    PaymentHistory createPaymentHistory(Long billId, java.math.BigDecimal paymentAmount, 
                                      java.math.BigDecimal totalAmount, java.math.BigDecimal partialPaymentFee,
                                      java.math.BigDecimal overdueInterest, String paymentMethod, 
                                      String transactionId, String notes);

    /**
     * Cập nhật thông tin giao dịch cho lịch sử thanh toán
     */
    PaymentHistory updateTransactionInfo(Long paymentHistoryId, String transactionId, String status, String notes);

    /**
     * Xóa lịch sử thanh toán (chỉ admin)
     */
    void deletePaymentHistory(Long paymentHistoryId);

    /**
     * Lấy thống kê thanh toán
     */
    java.util.Map<String, Object> getPaymentStatistics(Long billId);

    /**
     * Lấy payment history theo ID
     */
    PaymentHistory getPaymentHistoryById(Long paymentHistoryId);
}


