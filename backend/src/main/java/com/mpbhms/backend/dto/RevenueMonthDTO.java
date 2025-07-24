package com.mpbhms.backend.dto;
import java.math.BigDecimal;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class RevenueMonthDTO {
    private String month;
    private BigDecimal revenue;
} 