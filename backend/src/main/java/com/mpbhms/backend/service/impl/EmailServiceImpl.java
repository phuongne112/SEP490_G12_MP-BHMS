package com.mpbhms.backend.service.impl;

import com.mpbhms.backend.service.EmailService;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class EmailServiceImpl implements EmailService {

    private final JavaMailSender mailSender;

    // URL frontend reset password (prod domain)
    private String resetUrl = "http://mpbhms.online/resetPassword";

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

    @Override
    public void sendBillWithAttachment(String toEmail, String subject, String content, byte[] pdfBytes) {
        MimeMessage message = mailSender.createMimeMessage();
        try {
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setTo(toEmail);
            helper.setSubject(subject);
            helper.setText(content, true);
            helper.addAttachment("bill.pdf", new org.springframework.core.io.ByteArrayResource(pdfBytes));
            mailSender.send(message);
        } catch (MessagingException e) {
            throw new RuntimeException("Gửi email hóa đơn thất bại", e);
        }
    }

    @Override
    public void sendCashPaymentRejectionEmail(String toEmail, String fullName, String roomNumber, java.math.BigDecimal paymentAmount, Long billId, String reason) {
        String subject = "Thanh toán tiền mặt bị từ chối - Hóa đơn #" + billId;
        
        String content = """
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background-color: #fff2f0; border: 1px solid #ffccc7; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                    <h2 style="color: #cf1322; margin: 0 0 15px 0; font-size: 20px;">⚠️ Thanh toán tiền mặt bị từ chối</h2>
                    <p style="margin: 0; color: #cf1322; font-weight: bold;">Yêu cầu thanh toán tiền mặt của bạn đã bị từ chối.</p>
                </div>
                
                <div style="background-color: #f6f6f6; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                    <h3 style="color: #333; margin: 0 0 15px 0; font-size: 16px;">Thông tin chi tiết</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 8px 0; font-weight: bold; color: #333;">Người thuê:</td>
                            <td style="padding: 8px 0; color: #666;">%s</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; font-weight: bold; color: #333;">Phòng:</td>
                            <td style="padding: 8px 0; color: #666;">%s</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; font-weight: bold; color: #333;">Mã hóa đơn:</td>
                            <td style="padding: 8px 0; color: #666;">#%d</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; font-weight: bold; color: #333;">Số tiền bị từ chối:</td>
                            <td style="padding: 8px 0; color: #cf1322; font-weight: bold;">%,.0f ₫</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; font-weight: bold; color: #333;">Ngày từ chối:</td>
                            <td style="padding: 8px 0; color: #666;">%s</td>
                        </tr>
                    </table>
                </div>
                
                <div style="background-color: #fff7e6; border: 1px solid #ffd591; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                    <h3 style="color: #d46b08; margin: 0 0 15px 0; font-size: 16px;">Lý do từ chối</h3>
                    <p style="margin: 0; color: #d46b08;">%s</p>
                </div>
                
                <div style="background-color: #f6ffed; border: 1px solid #b7eb8f; border-radius: 8px; padding: 20px;">
                    <h3 style="color: #389e0d; margin: 0 0 15px 0; font-size: 16px;">Hướng dẫn tiếp theo</h3>
                    <ul style="margin: 0; padding-left: 20px; color: #389e0d;">
                        <li>Vui lòng liên hệ với chủ trọ để biết thêm chi tiết</li>
                        <li>Bạn có thể thử thanh toán lại bằng phương thức khác</li>
                        <li>Hoặc thanh toán trực tiếp tại văn phòng</li>
                    </ul>
                </div>
                
                <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e8e8e8;">
                    <p style="color: #666; font-size: 12px; margin: 0;">
                        Email này được gửi tự động từ hệ thống quản lý nhà trọ.<br>
                        Vui lòng không trả lời email này.
                    </p>
                </div>
            </div>
            """.formatted(
                fullName,
                roomNumber,
                billId,
                paymentAmount,
                java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm").format(java.time.LocalDateTime.now()),
                reason != null && !reason.trim().isEmpty() ? reason : "Không có lý do cụ thể"
            );
        
        sendHtmlEmail(toEmail, subject, content);
    }
}
