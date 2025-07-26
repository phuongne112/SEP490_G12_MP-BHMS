package com.mpbhms.backend.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class UpdateServicePriceRequest {
    @NotNull(message = "Vui lòng nhập giá mới")
    @Positive(message = "Giá phải là số dương")
    private BigDecimal newUnitPrice;
    
    @NotNull(message = "Vui lòng chọn ngày hiệu lực")
    private LocalDate effectiveDate;
    
    private String reason;
} 