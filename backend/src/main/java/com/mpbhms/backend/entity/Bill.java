package com.mpbhms.backend.entity;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import com.mpbhms.backend.enums.BillType;
import com.mpbhms.backend.enums.PaymentCycle;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "bills")
@Getter
@Setter
public class Bill extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_id", nullable = false)
    private Room room;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "contract_id", nullable = false)
    private Contract contract;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss a",timezone = "GMT+7")
    @Column(name = "from_date", nullable = false)
    private Instant fromDate;
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss a",timezone = "GMT+7")
    @Column(name = "to_date", nullable = false)
    private Instant toDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_cycle", nullable = false)
    private PaymentCycle paymentCycle;

    @Column(name = "total_amount", precision = 15, scale = 2, nullable = false)
    private BigDecimal totalAmount;
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss a",timezone = "GMT+7")
    @Column(name = "bill_date", nullable = false)
    private Instant billDate;
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss a",timezone = "GMT+7")
    @Column(name = "due_date")
    private Instant dueDate;
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss a",timezone = "GMT+7")
    @Column(name = "paid_date")
    private Instant paidDate;

    @Column(name = "status")
    private Boolean status = false;

    @Enumerated(EnumType.STRING)
    @Column(name = "bill_type", nullable = false, length = 20)
    private BillType billType = BillType.CONTRACT_TOTAL;

    @Column(columnDefinition = "TEXT")
    private String notes;

    // Trường để theo dõi hóa đơn phạt
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "original_bill_id")
    private Bill originalBill; // Hóa đơn gốc bị phạt

    @Column(name = "penalty_rate", precision = 5, scale = 2)
    private BigDecimal penaltyRate; // Tỷ lệ phạt (%)

    @Column(name = "overdue_days")
    private Integer overdueDays; // Số ngày quá hạn

    @Column(name = "penalty_amount", precision = 15, scale = 2)
    private BigDecimal penaltyAmount; // Số tiền phạt

    @OneToMany(mappedBy = "bill", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference
    private List<BillDetail> billDetails = new ArrayList<>();
}
