package com.mpbhms.backend.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class ServiceDTO {
    private Long id;
    private String serviceName;
    private String unit;
    private BigDecimal unitPrice;
    private String serviceType;
    private Boolean isActive;
    private LocalDate endDate;
}
