package com.mpbhms.backend.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.mpbhms.backend.dto.BillDetailResponse;
import com.mpbhms.backend.enums.BillType;
import com.mpbhms.backend.enums.PaymentCycle;
import lombok.Data;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

@Data
public class BillResponse {
    private Long id;
    private Long contractId;
    private Long roomId;
    private String roomNumber;
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss a",timezone = "GMT+7")
    private Instant fromDate;
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss a",timezone = "GMT+7")
    private Instant toDate;
    private PaymentCycle paymentCycle;

    private BillType billType;
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss a",timezone = "GMT+7")
    private Instant billDate;
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss a",timezone = "GMT+7")
    private Instant dueDate;
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss a",timezone = "GMT+7")
    private Instant paidDate;

    private BigDecimal totalAmount;
    private Boolean status;

    private List<BillDetailResponse> details;
}
