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
    private BigDecimal paidAmount = BigDecimal.ZERO; // Số tiền gốc đã thanh toán
    
    @Column(name = "partial_payment_fees_collected", precision = 15, scale = 2)
    private BigDecimal partialPaymentFeesCollected = BigDecimal.ZERO; // Tổng phí thanh toán từng phần đã thu
    
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

    // Trường để theo dõi lãi suất cho thanh toán từng phần
    @Column(name = "interest_amount", precision = 15, scale = 2)
    private BigDecimal interestAmount = BigDecimal.ZERO; // Số tiền lãi hiện tại
    
    @Column(name = "months_overdue")
    private Integer monthsOverdue = 0; // Số tháng quá hạn
    
    @Column(name = "last_interest_calculation_date")
    private Instant lastInterestCalculationDate; // Ngày tính lãi cuối cùng

    // Khóa tạo URL thanh toán để tránh tạo trùng trong khoảng thời gian ngắn
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss a",timezone = "GMT+7")
    @Column(name = "payment_url_locked_until")
    private Instant paymentUrlLockedUntil;

    @OneToMany(mappedBy = "bill", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference
    private List<BillDetail> billDetails = new ArrayList<>();
    
    // Phương thức để tính toán outstanding amount
    public void calculateOutstandingAmount() {
        if (this.totalAmount != null) {
            BigDecimal paidAmountSafe = this.paidAmount != null ? this.paidAmount : BigDecimal.ZERO;
            this.outstandingAmount = this.totalAmount.subtract(paidAmountSafe);
            this.isPartiallyPaid = this.outstandingAmount.compareTo(BigDecimal.ZERO) > 0 && paidAmountSafe.compareTo(BigDecimal.ZERO) > 0;
            
            // Debug logging
            System.out.println("🧮 calculateOutstandingAmount:");
            System.out.println("  - totalAmount: " + this.totalAmount);
            System.out.println("  - paidAmount: " + paidAmountSafe);
            System.out.println("  - outstandingAmount: " + this.outstandingAmount);
            System.out.println("  - isPartiallyPaid: " + this.isPartiallyPaid);
        }
    }
    
    // Phương thức để thêm thanh toán (chỉ tiền gốc)
    public void addPayment(BigDecimal paymentAmount) {
        System.out.println("💳 addPayment - Trước khi cập nhật:");
        System.out.println("  - Số tiền thanh toán mới: " + paymentAmount);
        System.out.println("  - Số tiền đã trả hiện tại: " + this.paidAmount);
        
        if (this.paidAmount == null) {
            this.paidAmount = BigDecimal.ZERO;
        }
        this.paidAmount = this.paidAmount.add(paymentAmount);
        this.lastPaymentDate = Instant.now();
        
        System.out.println("💳 addPayment - Sau khi cộng:");
        System.out.println("  - Số tiền đã trả mới: " + this.paidAmount);
        
        this.calculateOutstandingAmount();
        
        // KHÔNG cập nhật status ở đây - để service layer xử lý
        // Status sẽ được cập nhật trong BillServiceImpl.makePartialPayment()
    }
    
    // Phương thức để cộng phí thanh toán từng phần
    public void addPartialPaymentFee(BigDecimal feeAmount) {
        System.out.println("💰 addPartialPaymentFee - Trước khi cập nhật:");
        System.out.println("  - Phí thanh toán từng phần mới: " + feeAmount);
        System.out.println("  - Tổng phí đã thu hiện tại: " + this.partialPaymentFeesCollected);
        
        if (this.partialPaymentFeesCollected == null) {
            this.partialPaymentFeesCollected = BigDecimal.ZERO;
        }
        this.partialPaymentFeesCollected = this.partialPaymentFeesCollected.add(feeAmount);
        
        System.out.println("💰 addPartialPaymentFee - Sau khi cộng:");
        System.out.println("  - Tổng phí đã thu mới: " + this.partialPaymentFeesCollected);
    }
}
