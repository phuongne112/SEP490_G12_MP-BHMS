package com.mpbhms.backend.dto;

import com.mpbhms.backend.enums.ContractStatus;
import com.mpbhms.backend.enums.PaymentCycle;
import lombok.Data;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

@Data
public class ContractDTO {
    private Long id;
    private Long roomId;
    private String roomNumber;
    private List<Long> roomUserIds;
    private List<String> renterNames;
    private Instant contractStartDate;
    private Instant contractEndDate;
    private ContractStatus contractStatus;
    private PaymentCycle paymentCycle;
    private BigDecimal depositAmount;
    private Double rentAmount;
    private String contractImage;
} 