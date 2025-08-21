package com.mpbhms.backend.service;

public interface EmailService {
    void sendPasswordResetLink(String toEmail, String token);
    void sendNotificationEmail(String toEmail, String subject, String content);
    void sendBillWithAttachment(String toEmail, String subject, String content, byte[] pdfBytes);
    void sendCashPaymentRejectionEmail(String toEmail, String fullName, String roomNumber, java.math.BigDecimal paymentAmount, Long billId, String reason);
}
