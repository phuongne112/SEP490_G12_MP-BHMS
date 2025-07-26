package com.mpbhms.backend.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class ServicePriceHistoryDTO {
    private Long id;
    private Long serviceId;
    private String serviceName;
    private BigDecimal unitPrice;
    private LocalDate effectiveDate;
    private LocalDate endDate;
    private String reason;
    private Boolean isActive;
    private LocalDate createdAt;
} 