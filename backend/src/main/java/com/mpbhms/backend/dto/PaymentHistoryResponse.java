package com.mpbhms.backend.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;

import java.math.BigDecimal;
import java.time.Instant;

@Data
public class PaymentHistoryResponse {
    private Long id;
    private Long billId;
    private String billNumber; // Số hóa đơn để hiển thị
    
    // Thông tin thanh toán
    private BigDecimal paymentAmount; // Số tiền gốc thanh toán
    private BigDecimal totalAmount; // Tổng số tiền (bao gồm phí)
    private BigDecimal partialPaymentFee; // Phí thanh toán từng phần
    private BigDecimal overdueInterest; // Lãi suất quá hạn
    private BigDecimal totalFees; // Tổng phí (partialPaymentFee + overdueInterest)
    
    // Thông tin giao dịch
    private String paymentMethod; // Phương thức thanh toán
    private Integer paymentNumber; // Số thứ tự lần thanh toán
    private String transactionId; // ID giao dịch từ VNPAY
    private String status; // Trạng thái thanh toán
    
    // Thông tin thời gian
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss a", timezone = "GMT+7")
    private Instant paymentDate; // Ngày thanh toán
    
    // Thông tin trước/sau thanh toán
    private BigDecimal outstandingBefore; // Số tiền nợ trước khi thanh toán
    private BigDecimal outstandingAfter; // Số tiền nợ sau khi thanh toán
    private BigDecimal paidBefore; // Số tiền đã trả trước khi thanh toán
    private BigDecimal paidAfter; // Số tiền đã trả sau khi thanh toán
    
    // Thông tin bổ sung
    private Boolean isPartialPayment; // Có phải thanh toán từng phần không
    private Boolean isFinalPayment; // Có phải thanh toán cuối cùng không
    private Integer monthsOverdue; // Số tháng quá hạn tại thời điểm thanh toán
    private String notes; // Ghi chú
    
    // Thông tin phòng (để hiển thị)
    private String roomNumber;
    private String roomAddress;
    
    // Thông tin người thanh toán (nếu có)
    private String payerName;
    private String payerEmail;
    
    // Constructor
    public PaymentHistoryResponse() {
        this.totalFees = BigDecimal.ZERO;
    }
    
    // Phương thức để tính tổng phí
    public void calculateTotalFees() {
        this.totalFees = BigDecimal.ZERO;
        if (this.partialPaymentFee != null) {
            this.totalFees = this.totalFees.add(this.partialPaymentFee);
        }
        if (this.overdueInterest != null) {
            this.totalFees = this.totalFees.add(this.overdueInterest);
        }
    }
    
    // Phương thức để kiểm tra có phải thanh toán cuối cùng không
    public void checkIsFinalPayment() {
        this.isFinalPayment = this.outstandingAfter != null && this.outstandingAfter.compareTo(BigDecimal.ZERO) <= 0;
    }
    
    // Phương thức để format số tiền
    public String getFormattedPaymentAmount() {
        return String.format("%,.0f VNĐ", this.paymentAmount != null ? this.paymentAmount.doubleValue() : 0);
    }
    
    public String getFormattedTotalAmount() {
        return String.format("%,.0f VNĐ", this.totalAmount != null ? this.totalAmount.doubleValue() : 0);
    }
    
    public String getFormattedTotalFees() {
        return String.format("%,.0f VNĐ", this.totalFees != null ? this.totalFees.doubleValue() : 0);
    }
    
    public String getFormattedOutstandingBefore() {
        return String.format("%,.0f VNĐ", this.outstandingBefore != null ? this.outstandingBefore.doubleValue() : 0);
    }
    
    public String getFormattedOutstandingAfter() {
        return String.format("%,.0f VNĐ", this.outstandingAfter != null ? this.outstandingAfter.doubleValue() : 0);
    }
    
    // Phương thức để lấy trạng thái hiển thị
    public String getStatusDisplay() {
        if ("SUCCESS".equals(this.status) || "COMPLETED".equals(this.status)) {
            return "Thành công";
        } else if ("FAILED".equals(this.status)) {
            return "Thất bại";
        } else if ("PENDING".equals(this.status)) {
            return "Đang xử lý";
        } else {
            return this.status;
        }
    }
    
    // Phương thức để lấy phương thức thanh toán hiển thị
    public String getPaymentMethodDisplay() {
        if ("VNPAY".equals(this.paymentMethod)) {
            return "VNPAY";
        } else if ("CASH".equals(this.paymentMethod)) {
            return "Tiền mặt";
        } else if ("BANK_TRANSFER".equals(this.paymentMethod)) {
            return "Chuyển khoản";
        } else {
            return this.paymentMethod;
        }
    }
    
    // Phương thức để lấy loại thanh toán hiển thị
    public String getPaymentTypeDisplay() {
        if (Boolean.TRUE.equals(this.isPartialPayment)) {
            return "Thanh toán từng phần";
        } else {
            return "Thanh toán đầy đủ";
        }
    }
}




