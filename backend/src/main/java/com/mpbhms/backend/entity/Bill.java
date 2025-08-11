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
    
    // Các trường mới cho thanh toán từng phần
    @Column(name = "paid_amount", precision = 15, scale = 2)
    private BigDecimal paidAmount = BigDecimal.ZERO; // Số tiền đã thanh toán
    
    @Column(name = "outstanding_amount", precision = 15, scale = 2)
    private BigDecimal outstandingAmount; // Số tiền còn nợ
    
    @Column(name = "is_partially_paid")
    private Boolean isPartiallyPaid = false; // Đánh dấu thanh toán từng phần
    
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss a",timezone = "GMT+7")
    @Column(name = "last_payment_date")
    private Instant lastPaymentDate; // Ngày thanh toán cuối cùng
    
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
    
    // Phương thức để tính toán outstanding amount
    public void calculateOutstandingAmount() {
        if (this.totalAmount != null) {
            this.outstandingAmount = this.totalAmount.subtract(this.paidAmount != null ? this.paidAmount : BigDecimal.ZERO);
            this.isPartiallyPaid = this.outstandingAmount.compareTo(BigDecimal.ZERO) > 0 && this.paidAmount.compareTo(BigDecimal.ZERO) > 0;
        }
    }
    
    // Phương thức để thêm thanh toán
    public void addPayment(BigDecimal paymentAmount) {
        if (this.paidAmount == null) {
            this.paidAmount = BigDecimal.ZERO;
        }
        this.paidAmount = this.paidAmount.add(paymentAmount);
        this.lastPaymentDate = Instant.now();
        this.calculateOutstandingAmount();
        
        // Cập nhật status nếu đã thanh toán hết
        if (this.outstandingAmount.compareTo(BigDecimal.ZERO) <= 0) {
            this.status = true;
            this.paidDate = Instant.now();
        }
    }
}
