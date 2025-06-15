package com.mpbhms.backend.dto;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class ServiceDTO {
    private Long id;
    private String serviceName;
    private String unit;
    private BigDecimal unitPrice;
    private String serviceType;
}
