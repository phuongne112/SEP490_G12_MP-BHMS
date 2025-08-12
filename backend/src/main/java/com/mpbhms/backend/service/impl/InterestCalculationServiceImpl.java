package com.mpbhms.backend.service.impl;

import com.mpbhms.backend.service.InterestCalculationService;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;

@Service
public class InterestCalculationServiceImpl implements InterestCalculationService {

    // Lãi suất cố định cho từng tháng
    private static final BigDecimal INTEREST_1_MONTH = new BigDecimal("200000"); // 200.000 VNĐ
    private static final BigDecimal INTEREST_2_MONTHS = new BigDecimal("500000"); // 500.000 VNĐ
    private static final BigDecimal INTEREST_3_MONTHS = new BigDecimal("1000000"); // 1.000.000 VNĐ

    @Override
    public BigDecimal calculateInterest(BigDecimal outstandingAmount, Instant dueDate, Instant currentDate) {
        if (outstandingAmount == null || outstandingAmount.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO;
        }

        if (dueDate == null || currentDate == null) {
            return BigDecimal.ZERO;
        }

        // Nếu chưa quá hạn thì không tính lãi
        if (currentDate.isBefore(dueDate)) {
            return BigDecimal.ZERO;
        }

        int monthsOverdue = calculateMonthsOverdue(dueDate, currentDate);
        return calculatePartialPaymentInterest(outstandingAmount, monthsOverdue);
    }

    @Override
    public BigDecimal calculatePartialPaymentInterest(BigDecimal outstandingAmount, int monthsOverdue) {
        if (outstandingAmount == null || outstandingAmount.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO;
        }

        // Tính lãi suất theo số tháng quá hạn
        BigDecimal interestAmount;
        switch (monthsOverdue) {
            case 1:
                interestAmount = INTEREST_1_MONTH;
                break;
            case 2:
                interestAmount = INTEREST_2_MONTHS;
                break;
            case 3:
                interestAmount = INTEREST_3_MONTHS;
                break;
            default:
                // Nếu quá 3 tháng, tính theo tháng thứ 3
                interestAmount = INTEREST_3_MONTHS;
                break;
        }

        return interestAmount;
    }

    @Override
    public int calculateMonthsOverdue(Instant dueDate, Instant currentDate) {
        if (dueDate == null || currentDate == null) {
            return 0;
        }

        // Nếu chưa quá hạn
        if (currentDate.isBefore(dueDate)) {
            return 0;
        }

        // Tính số ngày quá hạn
        long daysOverdue = ChronoUnit.DAYS.between(dueDate, currentDate);
        
        // Chuyển đổi thành số tháng (làm tròn lên)
        int monthsOverdue = (int) Math.ceil(daysOverdue / 30.0);
        
        // Giới hạn tối đa 3 tháng
        return Math.min(monthsOverdue, 3);
    }
}
