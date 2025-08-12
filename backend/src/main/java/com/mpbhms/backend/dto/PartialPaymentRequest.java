package com.mpbhms.backend.dto;

import lombok.Data;
import java.math.BigDecimal;

@Data
public class PartialPaymentRequest {
    private Long billId;
    private BigDecimal paymentAmount;
    private String paymentMethod; // "CASH", "VNPAY", "BANK_TRANSFER", etc.
    private String notes; // Ghi chú về khoản thanh toán
    private BigDecimal originalPaymentAmount; // Số tiền gốc (không bao gồm phí)
    private BigDecimal partialPaymentFee; // Phí thanh toán từng phần
    private BigDecimal overdueInterest; // Lãi suất quá hạn
    private BigDecimal totalWithFees; // Tổng bao gồm cả phí
    private Boolean skipPaymentHistoryCreation = false; // Flag để bỏ qua tạo PaymentHistory (dùng cho VNPay callback)
}


