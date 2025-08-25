package com.mpbhms.backend.service.impl;

import com.mpbhms.backend.dto.PaymentHistoryResponse;
import com.mpbhms.backend.entity.Bill;
import com.mpbhms.backend.entity.PaymentHistory;
import com.mpbhms.backend.exception.NotFoundException;
import com.mpbhms.backend.repository.BillRepository;
import com.mpbhms.backend.repository.PaymentHistoryRepository;
import com.mpbhms.backend.service.PaymentHistoryService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class PaymentHistoryServiceImpl implements PaymentHistoryService {

    @Autowired
    private PaymentHistoryRepository paymentHistoryRepository;

    @Autowired
    private BillRepository billRepository;

    @Override
    @Transactional
    public PaymentHistory savePaymentHistory(PaymentHistory paymentHistory) {
        System.out.println("DEBUG - Saving PaymentHistory ID: " + paymentHistory.getId());
        System.out.println("DEBUG - PaymentDate before save: " + paymentHistory.getPaymentDate());
        System.out.println("DEBUG - OutstandingBefore before save: " + paymentHistory.getOutstandingBefore());
        System.out.println("DEBUG - OutstandingAfter before save: " + paymentHistory.getOutstandingAfter());
        System.out.println("DEBUG - PaidBefore before save: " + paymentHistory.getPaidBefore());
        System.out.println("DEBUG - PaidAfter before save: " + paymentHistory.getPaidAfter());
        
        PaymentHistory saved = paymentHistoryRepository.save(paymentHistory);
        
        System.out.println("DEBUG - PaymentDate after save: " + saved.getPaymentDate());
        System.out.println("DEBUG - OutstandingBefore after save: " + saved.getOutstandingBefore());
        System.out.println("DEBUG - OutstandingAfter after save: " + saved.getOutstandingAfter());
        System.out.println("DEBUG - PaidBefore after save: " + saved.getPaidBefore());
        System.out.println("DEBUG - PaidAfter after save: " + saved.getPaidAfter());
        
        return saved;
    }

    @Override
    public List<PaymentHistoryResponse> getPaymentHistoryByBillId(Long billId) {
        System.out.println("DEBUG - Getting payment history for bill ID: " + billId);
        List<PaymentHistory> paymentHistories = paymentHistoryRepository.findByBillIdOrderByPaymentDateDesc(billId);
        System.out.println("DEBUG - Found " + paymentHistories.size() + " payment histories");
        for (PaymentHistory ph : paymentHistories) {
            System.out.println("DEBUG - PaymentHistory ID: " + ph.getId() + ", PaymentDate: " + ph.getPaymentDate());
            System.out.println("DEBUG - OutstandingBefore: " + ph.getOutstandingBefore() + ", OutstandingAfter: " + ph.getOutstandingAfter());
            System.out.println("DEBUG - PaidBefore: " + ph.getPaidBefore() + ", PaidAfter: " + ph.getPaidAfter());
            System.out.println("DEBUG - PaymentMethod: " + ph.getPaymentMethod());
        }
        return paymentHistories.stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    @Override
    public List<PaymentHistoryResponse> getPaymentHistoryByBillId(Long billId, int page, int size) {
        System.out.println("DEBUG - Getting payment history for bill ID: " + billId + " with pagination (page: " + page + ", size: " + size + ")");
        List<PaymentHistory> paymentHistories = paymentHistoryRepository.findByBillIdOrderByPaymentDateDesc(billId);
        System.out.println("DEBUG - Found " + paymentHistories.size() + " payment histories total");
        
        // Manual pagination since we need to sort by payment date desc
        int start = page * size;
        int end = Math.min(start + size, paymentHistories.size());
        
        if (start >= paymentHistories.size()) {
            System.out.println("DEBUG - No payment histories for this page");
            return List.of();
        }
        
        List<PaymentHistory> paginatedHistories = paymentHistories.subList(start, end);
        System.out.println("DEBUG - Returning " + paginatedHistories.size() + " payment histories for this page");
        
        for (PaymentHistory ph : paginatedHistories) {
            System.out.println("DEBUG - PaymentHistory ID: " + ph.getId() + ", PaymentMethod: " + ph.getPaymentMethod());
            System.out.println("DEBUG - OutstandingBefore: " + ph.getOutstandingBefore() + ", OutstandingAfter: " + ph.getOutstandingAfter());
        }
        
        return paginatedHistories.stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    @Override
    public List<PaymentHistoryResponse> getPaymentHistoryByRoomId(Long roomId) {
        List<PaymentHistory> paymentHistories = paymentHistoryRepository.findByRoomId(roomId);
        return paymentHistories.stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    @Override
    public List<PaymentHistoryResponse> getPaymentHistoryByUserId(Long userId) {
        List<PaymentHistory> paymentHistories = paymentHistoryRepository.findByUserId(userId);
        return paymentHistories.stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    @Override
    public List<PaymentHistoryResponse> getPaymentHistoryByDateRange(Instant startDate, Instant endDate) {
        List<PaymentHistory> paymentHistories = paymentHistoryRepository.findByPaymentDateBetween(startDate, endDate);
        return paymentHistories.stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    @Override
    public List<PaymentHistoryResponse> getPaymentHistoryByPaymentMethod(String paymentMethod) {
        List<PaymentHistory> paymentHistories = paymentHistoryRepository.findByPaymentMethodOrderByPaymentDateDesc(paymentMethod);
        return paymentHistories.stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    @Override
    public List<PaymentHistoryResponse> getPartialPaymentHistoryByBillId(Long billId) {
        List<PaymentHistory> paymentHistories = paymentHistoryRepository.findByBillIdAndIsPartialPaymentTrueOrderByPaymentDateDesc(billId);
        return paymentHistories.stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    @Override
    public PaymentHistoryResponse getLatestPaymentByBillId(Long billId) {
        PaymentHistory paymentHistory = paymentHistoryRepository.findLatestPaymentByBillId(billId);
        return paymentHistory != null ? convertToResponse(paymentHistory) : null;
    }

    @Override
    public long countPaymentsByBillId(Long billId) {
        return paymentHistoryRepository.countByBillId(billId);
    }

    @Override
    public long countSuccessfulPaymentsByBillId(Long billId) {
        return paymentHistoryRepository.countSuccessfulPaymentsByBillId(billId);
    }

    @Override
    public long countAllPaymentsByBillId(Long billId) {
        return paymentHistoryRepository.countAllPaymentsByBillId(billId);
    }

    @Override
    public BigDecimal getTotalPaidAmountByBillId(Long billId) {
        return paymentHistoryRepository.sumPaymentAmountByBillId(billId);
    }

    @Override
    public BigDecimal getTotalPartialPaymentFeesByBillId(Long billId) {
        return paymentHistoryRepository.sumPartialPaymentFeesByBillId(billId);
    }

    @Override
    public BigDecimal getTotalOverdueInterestByBillId(Long billId) {
        return paymentHistoryRepository.sumOverdueInterestByBillId(billId);
    }

    @Override
    @Transactional
    public PaymentHistory createPaymentHistory(Long billId, BigDecimal paymentAmount, 
                                             BigDecimal totalAmount, BigDecimal partialPaymentFee,
                                             BigDecimal overdueInterest, String paymentMethod, 
                                             String transactionId, String notes) {
        
        Bill bill = billRepository.findById(billId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy hóa đơn với ID: " + billId));
        
        // Lấy số thứ tự thanh toán
        long paymentCount = paymentHistoryRepository.countByBillId(billId);
        int paymentNumber = (int) paymentCount + 1;
        
        // Tạo lịch sử thanh toán
        PaymentHistory paymentHistory = new PaymentHistory(
            bill, paymentAmount, totalAmount, partialPaymentFee, 
            overdueInterest, paymentMethod, paymentNumber
        );
        
        // Cập nhật thông tin trước/sau thanh toán
        BigDecimal outstandingBefore = bill.getOutstandingAmount() != null ? bill.getOutstandingAmount() : bill.getTotalAmount();
        BigDecimal paidBefore = bill.getPaidAmount() != null ? bill.getPaidAmount() : BigDecimal.ZERO;
        
        // Tính toán thông tin sau thanh toán
        BigDecimal paidAfter = paidBefore.add(paymentAmount);
        BigDecimal outstandingAfter = outstandingBefore.subtract(paymentAmount);
        
        // Đảm bảo số tiền nợ sau không âm
        if (outstandingAfter.compareTo(BigDecimal.ZERO) < 0) {
            outstandingAfter = BigDecimal.ZERO;
        }
        
        paymentHistory.updateOutstandingInfo(outstandingBefore, outstandingAfter, paidBefore, paidAfter);
        
        // Log thông tin tính toán
        System.out.println("=== DEBUG CREATE PAYMENT HISTORY ===");
        System.out.println("Bill ID: " + billId);
        System.out.println("Payment Amount: " + paymentAmount);
        System.out.println("Outstanding Before: " + outstandingBefore);
        System.out.println("Outstanding After: " + outstandingAfter);
        System.out.println("Paid Before: " + paidBefore);
        System.out.println("Paid After: " + paidAfter);
        System.out.println("Payment Date: " + paymentHistory.getPaymentDate());
        
        // Cập nhật thông tin giao dịch
        paymentHistory.updateTransactionInfo(transactionId, "SUCCESS", notes);
        
        // Lưu lịch sử thanh toán
        return paymentHistoryRepository.save(paymentHistory);
    }

    @Override
    @Transactional
    public PaymentHistory updateTransactionInfo(Long paymentHistoryId, String transactionId, String status, String notes) {
        PaymentHistory paymentHistory = paymentHistoryRepository.findById(paymentHistoryId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy lịch sử thanh toán với ID: " + paymentHistoryId));
        
        paymentHistory.updateTransactionInfo(transactionId, status, notes);
        return paymentHistoryRepository.save(paymentHistory);
    }

    @Override
    @Transactional
    public void deletePaymentHistory(Long paymentHistoryId) {
        PaymentHistory paymentHistory = paymentHistoryRepository.findById(paymentHistoryId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy lịch sử thanh toán với ID: " + paymentHistoryId));
        
        paymentHistoryRepository.delete(paymentHistory);
    }

    @Override
    public Map<String, Object> getPaymentStatistics(Long billId) {
        try {
            long totalPayments = countPaymentsByBillId(billId);
            BigDecimal totalPaidAmount = getTotalPaidAmountByBillId(billId);
            BigDecimal totalPartialPaymentFees = getTotalPartialPaymentFeesByBillId(billId);
            BigDecimal totalOverdueInterest = getTotalOverdueInterestByBillId(billId);
            
            PaymentHistoryResponse latestPayment = null;
            try {
                latestPayment = getLatestPaymentByBillId(billId);
            } catch (Exception e) {
                // Nếu không có lịch sử thanh toán, latestPayment sẽ là null
                System.out.println("Không có lịch sử thanh toán cho hóa đơn #" + billId + ": " + e.getMessage());
            }
            
            Map<String, Object> statistics = new HashMap<>();
            statistics.put("totalPayments", totalPayments);
            statistics.put("totalPaidAmount", totalPaidAmount != null ? totalPaidAmount : BigDecimal.ZERO);
            statistics.put("totalPartialPaymentFees", totalPartialPaymentFees != null ? totalPartialPaymentFees : BigDecimal.ZERO);
            statistics.put("totalOverdueInterest", totalOverdueInterest != null ? totalOverdueInterest : BigDecimal.ZERO);
            statistics.put("totalFees", (totalPartialPaymentFees != null ? totalPartialPaymentFees : BigDecimal.ZERO)
                .add(totalOverdueInterest != null ? totalOverdueInterest : BigDecimal.ZERO));
            statistics.put("latestPayment", latestPayment);
            
            return statistics;
        } catch (Exception e) {
            System.err.println("Lỗi khi lấy thống kê thanh toán cho hóa đơn #" + billId + ": " + e.getMessage());
            e.printStackTrace();
            throw e;
        }
    }

    /**
     * Chuyển đổi PaymentHistory entity thành PaymentHistoryResponse
     */
    private PaymentHistoryResponse convertToResponse(PaymentHistory paymentHistory) {
        PaymentHistoryResponse response = new PaymentHistoryResponse();
        
        response.setId(paymentHistory.getId());
        response.setBillId(paymentHistory.getBill().getId());
        response.setBillNumber("HĐ#" + paymentHistory.getBill().getId());
        
        // Thông tin thanh toán
        response.setPaymentAmount(paymentHistory.getPaymentAmount());
        response.setTotalAmount(paymentHistory.getTotalAmount());
        response.setPartialPaymentFee(paymentHistory.getPartialPaymentFee());
        response.setOverdueInterest(paymentHistory.getOverdueInterest());
        
        // Thông tin giao dịch
        response.setPaymentMethod(paymentHistory.getPaymentMethod());
        response.setPaymentNumber(paymentHistory.getPaymentNumber());
        response.setTransactionId(paymentHistory.getTransactionId());
        response.setStatus(paymentHistory.getStatus());
        
        // Thông tin thời gian
        System.out.println("DEBUG - PaymentHistory ID: " + paymentHistory.getId());
        System.out.println("DEBUG - PaymentDate from entity: " + paymentHistory.getPaymentDate());
        response.setPaymentDate(paymentHistory.getPaymentDate());
        
        // Thông tin trước/sau thanh toán
        System.out.println("DEBUG - OutstandingBefore: " + paymentHistory.getOutstandingBefore());
        System.out.println("DEBUG - OutstandingAfter: " + paymentHistory.getOutstandingAfter());
        System.out.println("DEBUG - PaidBefore: " + paymentHistory.getPaidBefore());
        System.out.println("DEBUG - PaidAfter: " + paymentHistory.getPaidAfter());
        
        response.setOutstandingBefore(paymentHistory.getOutstandingBefore());
        response.setOutstandingAfter(paymentHistory.getOutstandingAfter());
        response.setPaidBefore(paymentHistory.getPaidBefore());
        response.setPaidAfter(paymentHistory.getPaidAfter());
        
        // Thông tin bổ sung
        response.setIsPartialPayment(paymentHistory.getIsPartialPayment());
        response.setMonthsOverdue(paymentHistory.getMonthsOverdue());
        response.setNotes(paymentHistory.getNotes());
        
        // Thông tin phòng
        if (paymentHistory.getBill().getRoom() != null) {
            response.setRoomNumber(paymentHistory.getBill().getRoom().getRoomNumber());
            response.setRoomAddress(paymentHistory.getBill().getRoom().getBuilding());
        }
        
        // Tính toán các giá trị phụ
        response.calculateTotalFees();
        response.checkIsFinalPayment();
        
        return response;
    }

    @Override
    public PaymentHistory getPaymentHistoryById(Long paymentHistoryId) {
        PaymentHistory paymentHistory = paymentHistoryRepository.findById(paymentHistoryId)
                .orElse(null);
        if (paymentHistory != null) {
            System.out.println("DEBUG - Retrieved PaymentHistory ID: " + paymentHistory.getId());
            System.out.println("DEBUG - PaymentDate from DB: " + paymentHistory.getPaymentDate());
        }
        return paymentHistory;
    }
}
