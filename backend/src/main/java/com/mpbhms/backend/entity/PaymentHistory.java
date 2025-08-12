package com.mpbhms.backend.entity;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "payment_history")
@Getter
@Setter
public class PaymentHistory extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "bill_id", nullable = false)
    private Bill bill;

    @Column(name = "payment_amount", precision = 15, scale = 2, nullable = false)
    private BigDecimal paymentAmount; // Số tiền gốc thanh toán

    @Column(name = "total_amount", precision = 15, scale = 2, nullable = false)
    private BigDecimal totalAmount; // Tổng số tiền (bao gồm phí)

    @Column(name = "partial_payment_fee", precision = 15, scale = 2)
    private BigDecimal partialPaymentFee; // Phí thanh toán từng phần

    @Column(name = "overdue_interest", precision = 15, scale = 2)
    private BigDecimal overdueInterest; // Lãi suất quá hạn

    @Column(name = "payment_method", length = 50)
    private String paymentMethod; // Phương thức thanh toán (VNPAY, CASH, etc.)

    @Column(name = "payment_number")
    private Integer paymentNumber; // Số thứ tự lần thanh toán

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss a", timezone = "GMT+7")
    @Column(name = "payment_date", nullable = false)
    private Instant paymentDate; // Ngày thanh toán

    @Column(name = "outstanding_before", precision = 15, scale = 2)
    private BigDecimal outstandingBefore; // Số tiền nợ trước khi thanh toán

    @Column(name = "outstanding_after", precision = 15, scale = 2)
    private BigDecimal outstandingAfter; // Số tiền nợ sau khi thanh toán

    @Column(name = "paid_before", precision = 15, scale = 2)
    private BigDecimal paidBefore; // Số tiền đã trả trước khi thanh toán

    @Column(name = "paid_after", precision = 15, scale = 2)
    private BigDecimal paidAfter; // Số tiền đã trả sau khi thanh toán

    @Column(name = "transaction_id", length = 100)
    private String transactionId; // ID giao dịch từ VNPAY

    @Column(name = "status", length = 20)
    private String status; // Trạng thái thanh toán (SUCCESS, FAILED, PENDING)

    @Column(columnDefinition = "TEXT")
    private String notes; // Ghi chú

    @Column(name = "is_partial_payment")
    private Boolean isPartialPayment = false; // Có phải thanh toán từng phần không

    @Column(name = "months_overdue")
    private Integer monthsOverdue; // Số tháng quá hạn tại thời điểm thanh toán

    // Constructor
    public PaymentHistory() {
        this.paymentDate = Instant.now();
        this.status = "SUCCESS";
    }

    // Constructor với thông tin cơ bản
    public PaymentHistory(Bill bill, BigDecimal paymentAmount, BigDecimal totalAmount, 
                         BigDecimal partialPaymentFee, BigDecimal overdueInterest, 
                         String paymentMethod, Integer paymentNumber) {
        this();
        this.bill = bill;
        this.paymentAmount = paymentAmount;
        this.totalAmount = totalAmount;
        this.partialPaymentFee = partialPaymentFee;
        this.overdueInterest = overdueInterest;
        this.paymentMethod = paymentMethod;
        this.paymentNumber = paymentNumber;
        this.isPartialPayment = paymentAmount.compareTo(bill.getTotalAmount()) < 0;
    }

    // Phương thức để cập nhật thông tin trước/sau thanh toán
    public void updateOutstandingInfo(BigDecimal outstandingBefore, BigDecimal outstandingAfter,
                                    BigDecimal paidBefore, BigDecimal paidAfter) {
        this.outstandingBefore = outstandingBefore;
        this.outstandingAfter = outstandingAfter;
        this.paidBefore = paidBefore;
        this.paidAfter = paidAfter;
    }

    // Phương thức để cập nhật thông tin giao dịch
    public void updateTransactionInfo(String transactionId, String status, String notes) {
        this.transactionId = transactionId;
        this.status = status;
        this.notes = notes;
    }

    // Phương thức để tính tổng phí
    public BigDecimal getTotalFees() {
        BigDecimal totalFees = BigDecimal.ZERO;
        if (this.partialPaymentFee != null) {
            totalFees = totalFees.add(this.partialPaymentFee);
        }
        if (this.overdueInterest != null) {
            totalFees = totalFees.add(this.overdueInterest);
        }
        return totalFees;
    }

    // Phương thức để kiểm tra có phải thanh toán cuối cùng không
    public Boolean isFinalPayment() {
        return this.outstandingAfter != null && this.outstandingAfter.compareTo(BigDecimal.ZERO) <= 0;
    }
}




