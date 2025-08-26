package com.mpbhms.backend.service;

import com.mpbhms.backend.dto.BillResponse;
import com.mpbhms.backend.entity.Bill;
import com.mpbhms.backend.enums.BillType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import com.mpbhms.backend.dto.BillDetailResponse;
import com.mpbhms.backend.dto.PartialPaymentRequest;
import com.mpbhms.backend.dto.PartialPaymentResponse;
import java.time.LocalDate;
import java.util.List;
import java.math.BigDecimal;
import com.mpbhms.backend.dto.RevenueMonthDTO;

public interface BillService {
    // Tạo bill bất kỳ theo fromDate/toDate
    Bill generateBill(Long contractId, LocalDate fromDate, LocalDate toDate, BillType billType);

    // Tạo bill đầu tiên theo hợp đồng (tự tính chu kỳ từ ContractStartDate)
    Bill generateFirstBill(Long contractId);

    Page<Bill> getBillsByContractOrRoom(Long contractId, Long roomId, Pageable pageable);
    Bill getBillById(Long billId);

    // Convert Bill to BillResponse với transaction
    @org.springframework.transaction.annotation.Transactional
    BillResponse toResponse(Bill bill);

    List<BillDetailResponse> calculateServiceBill(Long roomId, int month, int year);

    BillResponse createAndSaveServiceBill(Long roomId, int month, int year);

    @org.springframework.transaction.annotation.Transactional
    void deleteBillById(Long id);

    Page<Bill> filterBills(Long roomId, Boolean status, BigDecimal minPrice, BigDecimal maxPrice, String search, Pageable pageable);

    BillResponse createCustomBill(Long roomId, String name, String description, java.math.BigDecimal amount, java.time.Instant fromDate, java.time.Instant toDate);

    byte[] generateBillPdf(Long billId);

    Page<Bill> getBillsByUserId(Long userId, Pageable pageable);

    long countUnpaid();
    long countPaid();
    long countOverdue();
    java.math.BigDecimal getTotalRevenue();
    java.util.List<com.mpbhms.backend.dto.RevenueMonthDTO> getRevenueByMonth(int months);
    java.math.BigDecimal getMonthRevenue(String month);
  
    // Tạo hóa đơn tự động hàng loạt cho tất cả phòng
    List<BillResponse> bulkGenerateBills();
    
    // Tạo hóa đơn dịch vụ tự động cho tất cả phòng
    List<BillResponse> autoGenerateServiceBills();

    // Cập nhật trạng thái thanh toán hóa đơn
    BillResponse updatePaymentStatus(Long billId, Boolean status);
    
    // Thanh toán từng phần
    PartialPaymentResponse makePartialPayment(PartialPaymentRequest request);

    // Xử lý phạt quá hạn
    BillResponse createLatePenaltyBill(Long originalBillId);
    
    // Kiểm tra và tạo phạt quá hạn tự động
    List<BillResponse> checkAndCreateLatePenalties();
    
    // Tính toán phạt quá hạn
    java.math.BigDecimal calculateLatePenalty(java.math.BigDecimal originalAmount, int overdueDays);
    
    // Lấy danh sách hóa đơn quá hạn
    List<Bill> getOverdueBills();
    
    // Lấy tất cả hóa đơn phạt
    List<Bill> getAllPenaltyBills();

    /**
     * Lấy số lần thanh toán đã thực hiện cho một hóa đơn
     */
    int getPaymentCount(Long billId);

    /**
     * Lấy tổng số lần thanh toán của một hóa đơn (bao gồm tất cả status: SUCCESS, PENDING, REJECTED)
     * Dùng để tạo paymentNumber
     */
    int getAllPaymentCount(Long billId);

    /**
     * Tính phí thanh toán từng phần cho lần thanh toán tiếp theo
     */
    java.math.BigDecimal calculateNextPaymentFee(int paymentCount);
    
    // Gửi thông báo cảnh báo hóa đơn quá hạn
    void sendOverdueWarningNotification(Bill bill);
    
    // 🆕 Gửi cảnh báo cho hóa đơn quá hạn 7 ngày
    void sendOverdueWarningFor7Days();
    
    // Tính số ngày quá hạn
    int calculateOverdueDays(Bill bill);
    
    // Tạo nội dung email hóa đơn thông thường
    String buildNormalBillEmailContent(Bill bill, String paymentUrl);
    
    // 🆕 Tạo nội dung email hóa đơn đơn giản chỉ có PDF + link chi tiết (không có QR/payment URL)
    String buildSimpleBillEmailContent(Bill bill);

    // Tạo nội dung email thông báo thanh toán từng phần/tiền mặt thành công
    String buildPartialPaymentEmailContent(com.mpbhms.backend.entity.Bill bill, java.math.BigDecimal paymentAmount);
    
    // 🆕 Thống kê doanh thu chi tiết cho dashboard
    java.util.Map<String, java.math.BigDecimal> getRevenueBreakdown();
    
    // 🆕 Đếm số hóa đơn thanh toán từng phần
    long countPartiallyPaidBills();
    
    // 🆕 KIỂM TRA TRẠNG THÁI XÓA HÓA ĐƠN CHI TIẾT
    java.util.Map<String, java.lang.Object> getBillDeletionStatus(Long billId);

    // 🆕 Anti-spam methods
    void checkEmailSpamLimit(Long billId, String ipAddress, String emailType);
    void logEmailSent(Long billId, String recipientEmail, String emailType, String ipAddress, String userAgent, Long sentByUserId);
}
