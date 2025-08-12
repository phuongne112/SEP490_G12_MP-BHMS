package com.mpbhms.backend.service;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;

public interface InterestCalculationService {
    
    /**
     * Tính lãi suất dựa trên thời gian nợ
     * @param outstandingAmount Số tiền còn nợ
     * @param dueDate Ngày hạn thanh toán
     * @param currentDate Ngày hiện tại
     * @return Số tiền lãi phải trả
     */
    BigDecimal calculateInterest(BigDecimal outstandingAmount, Instant dueDate, Instant currentDate);
    
    /**
     * Tính lãi suất cho thanh toán từng phần
     * @param outstandingAmount Số tiền còn nợ
     * @param monthsOverdue Số tháng quá hạn
     * @return Số tiền lãi phải trả
     */
    BigDecimal calculatePartialPaymentInterest(BigDecimal outstandingAmount, int monthsOverdue);
    
    /**
     * Tính số tháng quá hạn
     * @param dueDate Ngày hạn thanh toán
     * @param currentDate Ngày hiện tại
     * @return Số tháng quá hạn
     */
    int calculateMonthsOverdue(Instant dueDate, Instant currentDate);
}
