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
import java.util.Map;

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
    
    // Các trường mới cho thanh toán từng phần
    private BigDecimal paidAmount; // Số tiền gốc đã thanh toán
    private BigDecimal partialPaymentFeesCollected; // Tổng phí thanh toán từng phần đã thu
    private BigDecimal outstandingAmount; // Số tiền còn nợ
    private Boolean isPartiallyPaid; // Đánh dấu thanh toán từng phần
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss a",timezone = "GMT+7")
    private Instant lastPaymentDate; // Ngày thanh toán cuối cùng

    private List<BillDetailResponse> details;

    // Thông tin phạt quá hạn
    private Long originalBillId; // ID hóa đơn gốc bị phạt
    private BigDecimal penaltyRate; // Tỷ lệ phạt (%)
    private Integer overdueDays; // Số ngày quá hạn
    private BigDecimal penaltyAmount; // Số tiền phạt
    private String notes; // Ghi chú
    
    // Danh sách thanh toán tiền mặt pending
    private List<Map<String, Object>> pendingCashPayments;
}
