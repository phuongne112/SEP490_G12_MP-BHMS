package com.mpbhms.backend.dto;

import lombok.Data;
import java.math.BigDecimal;

@Data
public class PartialPaymentRequest {
    private Long billId;
    private BigDecimal paymentAmount;
    private String paymentMethod; // "CASH", "VNPAY", "BANK_TRANSFER", etc.
    private String notes; // Ghi chú về khoản thanh toán
}


