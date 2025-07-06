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
    private String resetUrl = "http://localhost:5173/resetPassword";

    @Override
    public void sendPasswordResetLink(String toEmail, String token) {
        String subject = "Yêu cầu đặt lại mật khẩu";
        String resetLink = resetUrl + "?token=" + token;

        String body = """
            <p>Xin chào,</p>
            <p>Bạn đã yêu cầu đặt lại mật khẩu cho tài khoản của mình.</p>
            <p>Nhấn vào liên kết bên dưới để đặt lại mật khẩu:</p>
            <p><a href=\"%s\">Đặt lại mật khẩu</a></p>
            <p>Nếu bạn không yêu cầu, vui lòng bỏ qua email này.</p>
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
            throw new RuntimeException("Gửi email thất bại", e);
        }
    }

    @Override
    public void sendNotificationEmail(String toEmail, String subject, String content) {
        MimeMessage message = mailSender.createMimeMessage();
        try {
            MimeMessageHelper helper = new MimeMessageHelper(message, true);
            helper.setTo(toEmail);
            helper.setSubject(subject);
            helper.setText(content, true);
            mailSender.send(message);
        } catch (MessagingException e) {
            throw new RuntimeException("Gửi email thông báo thất bại", e);
        }
    }
}
