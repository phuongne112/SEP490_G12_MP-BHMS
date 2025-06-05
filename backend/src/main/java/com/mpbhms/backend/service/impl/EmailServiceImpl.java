package com.mpbhms.backend.service.impl;

import com.mpbhms.backend.service.EmailService;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class EmailServiceImpl implements EmailService {

    private final JavaMailSender mailSender;

    //@Value("${app.frontend.reset-url}")
    //private String resetUrl;
    private String resetUrl = "http://localhost:8080/mpbhms/auth/reset-password";

    @Override
    public void sendPasswordResetLink(String toEmail, String token) {
        String subject = "Password Reset Request";
        String resetLink = resetUrl + "?token=" + token;

        String body = """
            <p>Hello,</p>
            <p>Click the link below to reset your password:</p>
            <p><a href="%s">Reset Password</a></p>
            <p>If you did not request this, please ignore this email.</p>
        """.formatted(resetLink);

        sendHtmlEmail(toEmail, subject, body);
    }

    private void sendHtmlEmail(String to, String subject, String htmlContent) {
        MimeMessage message = mailSender.createMimeMessage();
        try {
            MimeMessageHelper helper = new MimeMessageHelper(message, true);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(htmlContent, true);
            mailSender.send(message);
        } catch (MessagingException e) {
            throw new RuntimeException("Failed to send email", e);
        }
    }
}
