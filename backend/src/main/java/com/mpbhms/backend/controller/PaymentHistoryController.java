package com.mpbhms.backend.controller;

import com.mpbhms.backend.dto.PaymentHistoryResponse;
import com.mpbhms.backend.service.PaymentHistoryService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/mpbhms/payment-history")
@CrossOrigin(origins = "*")
public class PaymentHistoryController {

    @Autowired
    private PaymentHistoryService paymentHistoryService;

    /**
     * Lấy lịch sử thanh toán của một hóa đơn
     */
    @GetMapping("/bill/{billId}")
    public ResponseEntity<?> getPaymentHistoryByBillId(@PathVariable Long billId) {
        try {
            List<PaymentHistoryResponse> paymentHistories = paymentHistoryService.getPaymentHistoryByBillId(billId);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("data", paymentHistories);
            response.put("total", paymentHistories.size());
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "Lỗi khi lấy lịch sử thanh toán: " + e.getMessage());
            return ResponseEntity.status(500).body(errorResponse);
        }
    }

    /**
     * Lấy lịch sử thanh toán của một hóa đơn với phân trang
     */
    @GetMapping("/bill/{billId}/page")
    public ResponseEntity<?> getPaymentHistoryByBillIdWithPagination(
            @PathVariable Long billId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        try {
            List<PaymentHistoryResponse> paymentHistories = paymentHistoryService.getPaymentHistoryByBillId(billId, page, size);
            long totalPayments = paymentHistoryService.countPaymentsByBillId(billId);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("data", paymentHistories);
            response.put("total", totalPayments);
            response.put("page", page);
            response.put("size", size);
            response.put("totalPages", (int) Math.ceil((double) totalPayments / size));
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "Lỗi khi lấy lịch sử thanh toán: " + e.getMessage());
            return ResponseEntity.status(500).body(errorResponse);
        }
    }

    /**
     * Lấy lịch sử thanh toán của một phòng
     */
    @GetMapping("/room/{roomId}")
    public ResponseEntity<?> getPaymentHistoryByRoomId(@PathVariable Long roomId) {
        try {
            List<PaymentHistoryResponse> paymentHistories = paymentHistoryService.getPaymentHistoryByRoomId(roomId);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("data", paymentHistories);
            response.put("total", paymentHistories.size());
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "Lỗi khi lấy lịch sử thanh toán: " + e.getMessage());
            return ResponseEntity.status(500).body(errorResponse);
        }
    }

    /**
     * Lấy lịch sử thanh toán của một người dùng
     */
    @GetMapping("/user/{userId}")
    public ResponseEntity<?> getPaymentHistoryByUserId(@PathVariable Long userId) {
        try {
            List<PaymentHistoryResponse> paymentHistories = paymentHistoryService.getPaymentHistoryByUserId(userId);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("data", paymentHistories);
            response.put("total", paymentHistories.size());
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "Lỗi khi lấy lịch sử thanh toán: " + e.getMessage());
            return ResponseEntity.status(500).body(errorResponse);
        }
    }

    /**
     * Lấy lịch sử thanh toán trong khoảng thời gian
     */
    @GetMapping("/date-range")
    public ResponseEntity<?> getPaymentHistoryByDateRange(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant endDate) {
        try {
            List<PaymentHistoryResponse> paymentHistories = paymentHistoryService.getPaymentHistoryByDateRange(startDate, endDate);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("data", paymentHistories);
            response.put("total", paymentHistories.size());
            response.put("startDate", startDate);
            response.put("endDate", endDate);
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "Lỗi khi lấy lịch sử thanh toán: " + e.getMessage());
            return ResponseEntity.status(500).body(errorResponse);
        }
    }

    /**
     * Lấy lịch sử thanh toán theo phương thức thanh toán
     */
    @GetMapping("/payment-method/{paymentMethod}")
    public ResponseEntity<?> getPaymentHistoryByPaymentMethod(@PathVariable String paymentMethod) {
        try {
            List<PaymentHistoryResponse> paymentHistories = paymentHistoryService.getPaymentHistoryByPaymentMethod(paymentMethod);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("data", paymentHistories);
            response.put("total", paymentHistories.size());
            response.put("paymentMethod", paymentMethod);
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "Lỗi khi lấy lịch sử thanh toán: " + e.getMessage());
            return ResponseEntity.status(500).body(errorResponse);
        }
    }

    /**
     * Lấy lịch sử thanh toán từng phần của một hóa đơn
     */
    @GetMapping("/bill/{billId}/partial")
    public ResponseEntity<?> getPartialPaymentHistoryByBillId(@PathVariable Long billId) {
        try {
            List<PaymentHistoryResponse> paymentHistories = paymentHistoryService.getPartialPaymentHistoryByBillId(billId);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("data", paymentHistories);
            response.put("total", paymentHistories.size());
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "Lỗi khi lấy lịch sử thanh toán từng phần: " + e.getMessage());
            return ResponseEntity.status(500).body(errorResponse);
        }
    }

    /**
     * Lấy lần thanh toán cuối cùng của một hóa đơn
     */
    @GetMapping("/bill/{billId}/latest")
    public ResponseEntity<?> getLatestPaymentByBillId(@PathVariable Long billId) {
        try {
            PaymentHistoryResponse latestPayment = paymentHistoryService.getLatestPaymentByBillId(billId);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("data", latestPayment);
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "Lỗi khi lấy lần thanh toán cuối cùng: " + e.getMessage());
            return ResponseEntity.status(500).body(errorResponse);
        }
    }

    /**
     * Lấy thống kê thanh toán của một hóa đơn
     */
    @GetMapping("/bill/{billId}/statistics")
    public ResponseEntity<?> getPaymentStatistics(@PathVariable Long billId) {
        try {
            Map<String, Object> statistics = paymentHistoryService.getPaymentStatistics(billId);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("data", statistics);
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "Lỗi khi lấy thống kê thanh toán: " + e.getMessage());
            return ResponseEntity.status(500).body(errorResponse);
        }
    }

    /**
     * Xóa lịch sử thanh toán (chỉ admin)
     */
    @DeleteMapping("/{paymentHistoryId}")
    public ResponseEntity<?> deletePaymentHistory(@PathVariable Long paymentHistoryId) {
        try {
            paymentHistoryService.deletePaymentHistory(paymentHistoryId);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Đã xóa lịch sử thanh toán thành công");
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "Lỗi khi xóa lịch sử thanh toán: " + e.getMessage());
            return ResponseEntity.status(500).body(errorResponse);
        }
    }
}




