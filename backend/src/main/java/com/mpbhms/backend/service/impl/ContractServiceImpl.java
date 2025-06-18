package com.mpbhms.backend.service.impl;

import com.lowagie.text.*;
import com.lowagie.text.pdf.BaseFont;
import com.lowagie.text.pdf.PdfWriter;
import com.mpbhms.backend.entity.Contract;
import com.mpbhms.backend.entity.Room;
import com.mpbhms.backend.entity.RoomUser;
import com.mpbhms.backend.entity.User;
import com.mpbhms.backend.repository.ContractRepository;
import com.mpbhms.backend.service.ContractService;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.nio.file.Paths;
import java.text.NumberFormat;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class ContractServiceImpl implements ContractService {

    private final ContractRepository contractRepository;

    @Override
    @Transactional
    public byte[] generateContractPdf(Long contractId) {
        Contract contract = contractRepository.findById(contractId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy hợp đồng"));

        Room room = contract.getRoom();
        RoomUser roomUser = contract.getRoomUser();
        User renter = roomUser.getUser();
        User landlord = room.getLandlord();

        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        Document document = new Document(PageSize.A4, 50, 50, 50, 50);

        try {
            String fontPath = Paths.get("src/main/resources/fonts/arial.ttf").toAbsolutePath().toString();
            BaseFont baseFont = BaseFont.createFont(fontPath, BaseFont.IDENTITY_H, BaseFont.EMBEDDED);
            Font titleFont = new Font(baseFont, 18, Font.BOLD);
            Font normalFont = new Font(baseFont, 12);
            Font smallBold = new Font(baseFont, 12, Font.BOLD);

            PdfWriter.getInstance(document, outputStream);
            document.open();

            // Format
            DateTimeFormatter dateFormatter = DateTimeFormatter.ofPattern("dd/MM/yyyy").withZone(ZoneId.systemDefault());
            DateTimeFormatter dateTimeFormatter = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
            NumberFormat currencyFormat = NumberFormat.getCurrencyInstance(new Locale("vi", "VN"));

            // Lấy thông tin
            String landlordName = (landlord.getUserInfo() != null) ? landlord.getUserInfo().getFullName() : "Chưa rõ";
            String landlordPhone = (landlord.getUserInfo() != null) ? landlord.getUserInfo().getPhoneNumber() : "Chưa rõ";
            String landlordCCCD = (landlord.getUserInfo() != null) ? landlord.getUserInfo().getNationalID() : "Chưa rõ";
            String landlordAddress = (landlord.getUserInfo() != null) ? landlord.getUserInfo().getPermanentAddress() : "Chưa rõ";

            String renterName = (renter.getUserInfo() != null) ? renter.getUserInfo().getFullName() : "Chưa rõ";
            String renterPhone = (renter.getUserInfo() != null) ? renter.getUserInfo().getPhoneNumber() : "Chưa rõ";
            String renterCCCD = (renter.getUserInfo() != null) ? renter.getUserInfo().getNationalID() : "Chưa rõ";
            String renterAddress = (renter.getUserInfo() != null) ? renter.getUserInfo().getPermanentAddress() : "Chưa rõ";

            String roomNumber = room.getRoomNumber() != null ? room.getRoomNumber() : "Không rõ";
            Double rentAmount = contract.getRentAmount() != null ? contract.getRentAmount() : 0.0;
            BigDecimal depositAmount = contract.getDepositAmount() != null ? contract.getDepositAmount() : BigDecimal.ZERO;

            Instant start = contract.getContractStartDate();
            Instant end = contract.getContractEndDate();

            // Quốc hiệu
            Paragraph header = new Paragraph("CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM", smallBold);
            header.setAlignment(Element.ALIGN_CENTER);
            document.add(header);

            Paragraph slogan = new Paragraph("Độc lập - Tự do - Hạnh phúc", smallBold);
            slogan.setAlignment(Element.ALIGN_CENTER);
            slogan.setSpacingAfter(10f);
            document.add(slogan);

            Paragraph separator = new Paragraph("--- o0o ---", normalFont);
            separator.setAlignment(Element.ALIGN_CENTER);
            separator.setSpacingAfter(10f);
            document.add(separator);

            Paragraph contractTitle = new Paragraph("HỢP ĐỒNG THUÊ NHÀ TRỌ", titleFont);
            contractTitle.setAlignment(Element.ALIGN_CENTER);
            contractTitle.setSpacingAfter(20f);
            document.add(contractTitle);

            // Mở đầu
            Paragraph intro = new Paragraph(String.format(
                    "Hôm nay, ngày %s, tại phòng số %s, chúng tôi gồm có:",
                    dateTimeFormatter.format(LocalDateTime.now()), roomNumber), normalFont);
            intro.setSpacingAfter(10f);
            document.add(intro);

            // BÊN A
            Paragraph benA = new Paragraph(String.format("""
                BÊN CHO THUÊ (BÊN A):
                - Chủ trọ: %s
                - Số điện thoại: %s
                - Số CCCD: %s
                - Địa chỉ thường trú: %s
                """, landlordName, landlordPhone, landlordCCCD, landlordAddress), normalFont);
            benA.setSpacingAfter(10f);
            document.add(benA);

            // BÊN B
            Paragraph benB = new Paragraph(String.format("""
                BÊN THUÊ (BÊN B):
                - Họ tên: %s
                - Số điện thoại: %s
                - Số CCCD: %s
                - Địa chỉ thường trú: %s
                """, renterName, renterPhone, renterCCCD, renterAddress), normalFont);
            benB.setSpacingAfter(10f);
            document.add(benB);

            // Điều khoản
            Paragraph content = new Paragraph(String.format("""
                Hai bên đồng ý ký kết hợp đồng thuê phòng trọ với các điều khoản sau:

                1. Thông tin phòng thuê:
                   - Phòng số: %s
                   - Giá thuê: %s / tháng
                   - Tiền cọc: %s
                   - Thời hạn thuê: từ ngày %s đến ngày %s
                   - Hình thức thanh toán: %s

                2. Quy định sử dụng:
                   - Bên B cam kết sử dụng phòng đúng mục đích, giữ gìn vệ sinh, an ninh.
                   - Mọi hư hỏng do Bên B gây ra sẽ phải đền bù theo thoả thuận.

                3. Chấm dứt hợp đồng:
                   - Hai bên thông báo trước 15 ngày khi muốn chấm dứt hợp đồng.

                Hợp đồng được lập thành 02 bản, mỗi bên giữ 01 bản có giá trị pháp lý như nhau.
                """,
                    roomNumber,
                    currencyFormat.format(rentAmount),
                    currencyFormat.format(depositAmount),
                    (start != null ? dateFormatter.format(start) : "??"),
                    (end != null ? dateFormatter.format(end) : "??"),
                    contract.getPaymentCycle()
            ), normalFont);
            content.setSpacingBefore(10f);
            content.setSpacingAfter(15f);
            content.setLeading(18f);
            content.setAlignment(Element.ALIGN_JUSTIFIED);
            document.add(content);

            // Chữ ký
            Paragraph sign = new Paragraph("""
                BÊN CHO THUÊ (BÊN A)                BÊN THUÊ (BÊN B)
                (Ký và ghi rõ họ tên)               (Ký và ghi rõ họ tên)
                """, normalFont);
            sign.setSpacingBefore(20f);
            sign.setAlignment(Element.ALIGN_CENTER);
            document.add(sign);

            document.close();
            return outputStream.toByteArray();

        } catch (Exception e) {
            e.printStackTrace();
            throw new RuntimeException("Không thể tạo PDF", e);
        }
    }
}
