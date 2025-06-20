package com.mpbhms.backend.dto;

import com.mpbhms.backend.enums.BillItemType;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class BillDetailResponse {
    private BillItemType itemType;
    private String description;

    private BigDecimal unitPriceAtBill;
    // private BigDecimal oldReading;
    // private BigDecimal newReading;
    private BigDecimal consumedUnits;
    private BigDecimal itemAmount;

    private String serviceName; // nếu là dịch vụ
}

