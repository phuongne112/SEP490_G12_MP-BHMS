package com.mpbhms.backend.dto;

import lombok.Data;
import java.math.BigDecimal;
import java.time.Instant;

@Data
public class PartialPaymentResponse {
    private Long billId;
    private BigDecimal paymentAmount;
    private BigDecimal previousPaidAmount;
    private BigDecimal newPaidAmount;
    private BigDecimal outstandingAmount;
    private Boolean isFullyPaid;
    private Instant paymentDate;
    private String paymentMethod;
    private String notes;
    private String message;
}


