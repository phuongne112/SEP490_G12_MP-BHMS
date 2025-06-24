package com.mpbhms.backend.service;

public interface EmailService {
    void sendPasswordResetLink(String toEmail, String token);
    void sendNotificationEmail(String toEmail, String subject, String content);
}
