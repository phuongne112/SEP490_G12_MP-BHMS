package com.mpbhms.backend.service;

public interface EmailService {
    void sendPasswordResetLink(String toEmail, String token);
}
