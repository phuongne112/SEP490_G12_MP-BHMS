package com.mpbhms.backend.dto;

import lombok.Data;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

@Data
public class UpdateContractRequest {
    private Long contractId;
    private Instant newEndDate;
    private Double newRentAmount;
    private Double newDepositAmount;
    private java.util.List<String> newTerms;
    private String reasonForUpdate; // Lý do cập nhật
    private Boolean requiresTenantApproval; // Có cần sự đồng ý của người thuê không
    private List<Long> tenantIds; // Danh sách ID người thuê cần thông báo
    private List<Long> renterIds; // Danh sách người thuê mới cho hợp đồng (nếu có thay đổi)
    private com.mpbhms.backend.enums.PaymentCycle paymentCycle; // Chu kỳ thanh toán mới
} 