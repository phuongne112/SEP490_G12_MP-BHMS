package com.mpbhms.backend.dto;

import com.mpbhms.backend.enums.ServiceType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class CreateServiceRequest {
    @NotBlank(message = "Service name is required")
    private String serviceName;
    
    @NotBlank(message = "Unit is required")
    private String unit;
    
    @NotNull(message = "Unit price is required")
    @Positive(message = "Unit price must be positive")
    private BigDecimal unitPrice;
    
    @NotNull(message = "Service type is required")
    private ServiceType serviceType;
} 