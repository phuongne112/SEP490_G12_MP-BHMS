package com.mpbhms.backend.service.impl;

import com.lowagie.text.*;
import com.lowagie.text.pdf.BaseFont;
import com.lowagie.text.pdf.PdfWriter;
import com.mpbhms.backend.entity.Contract;
import com.mpbhms.backend.entity.Room;
import com.mpbhms.backend.entity.RoomUser;
import com.mpbhms.backend.entity.User;
import com.mpbhms.backend.entity.ContractRenterInfo;
import com.mpbhms.backend.enums.RoomStatus;
import com.mpbhms.backend.repository.ContractRepository;
import com.mpbhms.backend.repository.RoomUserRepository;
import com.mpbhms.backend.service.ContractService;
import com.mpbhms.backend.service.RoomService;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import com.mpbhms.backend.dto.ContractDTO;
import com.mpbhms.backend.dto.ResultPaginationDTO;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import com.mpbhms.backend.repository.UserRepository;
import com.mpbhms.backend.util.SecurityUtil;
import com.mpbhms.backend.repository.ContractRenterInfoRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import com.mpbhms.backend.service.NotificationService;
import com.mpbhms.backend.service.EmailService;
import com.mpbhms.backend.service.ContractNotificationScheduler;
import com.mpbhms.backend.dto.NotificationDTO;
import com.mpbhms.backend.enums.NotificationType;
import com.mpbhms.backend.entity.ContractAmendment;
import com.mpbhms.backend.repository.ContractAmendmentRepository;
import com.mpbhms.backend.dto.UpdateContractRequest;
import com.mpbhms.backend.enums.ContractStatus;
import com.mpbhms.backend.entity.ContractTerm;
import com.mpbhms.backend.repository.ContractTermRepository;
import com.mpbhms.backend.repository.ContractLandlordInfoRepository;
import com.mpbhms.backend.dto.Meta;
import com.mpbhms.backend.entity.ContractTemplate;
import com.mpbhms.backend.service.ContractTemplateService;
import com.github.jknack.handlebars.Handlebars;
import com.github.jknack.handlebars.Template;
import com.openhtmltopdf.pdfboxout.PdfRendererBuilder;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.math.BigDecimal;
import java.nio.file.Paths;
import java.text.NumberFormat;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.Locale;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import java.util.Optional;
import java.util.Collections;
import java.util.Collection;
import java.util.Comparator;
import java.util.Arrays;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.Set;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;

@Service
@RequiredArgsConstructor
public class ContractServiceImpl implements ContractService {

    private final ContractRepository contractRepository;
    private final RoomUserRepository roomUserRepository;
    private final UserRepository userRepository;
    private final ContractRenterInfoRepository contractRenterInfoRepository;
    private final NotificationService notificationService;
    private final EmailService emailService;
    private final ContractAmendmentRepository contractAmendmentRepository;
    private final ContractTermRepository contractTermRepository;
    private final ContractLandlordInfoRepository contractLandlordInfoRepository;
    private final ContractTemplateService contractTemplateService;
    private final RoomService roomService;
    private final ContractNotificationScheduler contractNotificationScheduler;
    private static final Logger logger = LoggerFactory.getLogger(ContractServiceImpl.class);

    @Value("${contract.pending.expire-days:2}")
    private int contractPendingExpireDays;

    @Override
    @Transactional
    public byte[] generateContractPdf(Long contractId, Long templateId) {
        Contract contract = contractRepository.findById(contractId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy hợp đồng với mã: " + contractId));
        
        // Đảm bảo ContractRenterInfo và ContractLandlordInfo tồn tại
        ensureContractRenterInfoExists(contract);
        
        Room room = contract.getRoom();
        Long landlordId = room.getLandlord() != null ? room.getLandlord().getId() : null;
        try {
            // Nếu có template động thì dùng, không thì fallback về mẫu cứng
            ContractTemplate template = null;
            if (landlordId != null) {
                try {
                    template = contractTemplateService.getTemplateForLandlord(landlordId, templateId);
                } catch (Exception ignored) {}
            }
            if (template != null) {
                // Build data map
                java.util.Map<String, Object> data = buildContractDataMap(contract);
                String html = mergeTemplate(template.getContent(), data);
                return htmlToPdf(html);
            } else {
                // Fallback: dùng mẫu cứng như cũ
                return generateDefaultContractPdf(contractId);
            }
        } catch (Exception e) {
            logger.error("Lỗi khi tạo PDF cho hợp đồng {}: {}", contractId, e.getMessage(), e);
            throw new RuntimeException("Không thể tạo PDF: " + e.getMessage(), e);
        }
    }

    private java.util.Map<String, Object> buildContractDataMap(Contract contract) {
        java.util.Map<String, Object> map = new java.util.HashMap<>();

        // Log giá trị cần kiểm tra
        System.out.println("[DEBUG] Contract ID: " + contract.getId()
            + ", Rent: " + contract.getRentAmount()
            + ", Deposit: " + contract.getDepositAmount()
            + ", Cycle: " + contract.getPaymentCycle());

        // Lấy snapshot landlord từ ContractLandlordInfo
        java.util.List<com.mpbhms.backend.entity.ContractLandlordInfo> landlordInfos =
                contractLandlordInfoRepository.findByContractId(contract.getId());
        com.mpbhms.backend.entity.ContractLandlordInfo landlordInfo =
                (landlordInfos != null && !landlordInfos.isEmpty()) ? landlordInfos.get(0) : null;
        java.util.Map<String, Object> landlord = new java.util.HashMap<>();
        if (landlordInfo != null) {
            landlord.put("fullName", landlordInfo.getFullName());
            landlord.put("phoneNumber", landlordInfo.getPhoneNumber());
            landlord.put("nationalID", landlordInfo.getNationalID());
            landlord.put("permanentAddress", landlordInfo.getPermanentAddress());
        } else if (contract.getRoom() != null && contract.getRoom().getLandlord() != null
                && contract.getRoom().getLandlord().getUserInfo() != null) {
            landlord.put("fullName", contract.getRoom().getLandlord().getUserInfo().getFullName());
            landlord.put("phoneNumber", contract.getRoom().getLandlord().getUserInfo().getPhoneNumber());
            landlord.put("nationalID", contract.getRoom().getLandlord().getUserInfo().getNationalID());
            landlord.put("permanentAddress", contract.getRoom().getLandlord().getUserInfo().getPermanentAddress());
        } else {
            landlord.put("fullName", "Chưa rõ");
            landlord.put("phoneNumber", "Chưa rõ");
            landlord.put("nationalID", "Chưa rõ");
            landlord.put("permanentAddress", "Chưa rõ");
        }
        map.put("landlord", landlord);

        // Lấy snapshot renters từ ContractRenterInfo
        java.util.List<ContractRenterInfo> renterInfos = contractRenterInfoRepository.findByContractId(contract.getId());
        java.util.List<java.util.Map<String, Object>> renters = new java.util.ArrayList<>();
        if (renterInfos != null && !renterInfos.isEmpty()) {
            for (ContractRenterInfo info : renterInfos) {
                java.util.Map<String, Object> renter = new java.util.HashMap<>();
                renter.put("fullName", info.getFullName());
                renter.put("phoneNumber", info.getPhoneNumber());
                renter.put("nationalID", info.getNationalID());
                renter.put("permanentAddress", info.getPermanentAddress());
                renter.put("email", info.getEmail()); // Thêm email
                renters.add(renter);
            }
        } else {
            // Fallback: Lấy từ RoomUser nếu không có ContractRenterInfo
            logger.warn("Không tìm thấy ContractRenterInfo cho hợp đồng {}, fallback sang RoomUser", contract.getId());
            
            if (contract.getRoomUsers() != null && !contract.getRoomUsers().isEmpty()) {
                for (RoomUser roomUser : contract.getRoomUsers()) {
                    if (roomUser.getUser() != null && roomUser.getUser().getUserInfo() != null) {
                        java.util.Map<String, Object> renter = new java.util.HashMap<>();
                        renter.put("fullName", roomUser.getUser().getUserInfo().getFullName());
                        renter.put("phoneNumber", roomUser.getUser().getUserInfo().getPhoneNumber());
                        renter.put("nationalID", roomUser.getUser().getUserInfo().getNationalID());
                        renter.put("permanentAddress", roomUser.getUser().getUserInfo().getPermanentAddress());
                        renter.put("email", roomUser.getUser().getEmail()); // Thêm email
                        renters.add(renter);
                    }
                }
            }
        }
        map.put("renters", renters);

        // Thông tin phòng
        java.util.Map<String, Object> room = new java.util.HashMap<>();
        if (contract.getRoom() != null) {
            room.put("roomNumber", contract.getRoom().getRoomNumber());
        } else {
            room.put("roomNumber", "Không rõ");
        }
        map.put("room", room);

        // Thông tin hợp đồng
        map.put("contractNumber", contract.getContractNumber() != null ? contract.getContractNumber() : String.format("HD-%s-%05d", java.time.LocalDate.now().getYear(), contract.getId()));
        // Format tiền tệ kiểu Việt Nam
        java.text.NumberFormat currencyFormat = java.text.NumberFormat.getInstance(new java.util.Locale("vi", "VN"));
        map.put("rentAmount", contract.getRentAmount() != null ? currencyFormat.format(contract.getRentAmount()) : "0");
        map.put("depositAmount", contract.getDepositAmount() != null ? currencyFormat.format(contract.getDepositAmount()) : "0");
        map.put("paymentCycle", contract.getPaymentCycle() != null ? localizePaymentCycle(contract.getPaymentCycle()) : "");

        // Format ngày
        java.time.format.DateTimeFormatter dateFormatter = java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy")
                .withZone(java.time.ZoneId.systemDefault());
        map.put("startDate", contract.getContractStartDate() != null ? dateFormatter.format(contract.getContractStartDate()) : "");
        map.put("endDate", contract.getContractEndDate() != null ? dateFormatter.format(contract.getContractEndDate()) : "");

        // Điều khoản
        if (contract.getTerms() != null && !contract.getTerms().isEmpty()) {
            java.util.List<String> terms = contract.getTerms().stream()
                    .map(com.mpbhms.backend.entity.ContractTerm::getContent)
                    .toList();
            map.put("terms", terms);
        }

        return map;
    }

    /**
     * Localize payment cycle enum to Vietnamese
     */
    private String localizePaymentCycle(com.mpbhms.backend.enums.PaymentCycle paymentCycle) {
        if (paymentCycle == null) {
            return "";
        }
        
        return switch (paymentCycle) {
            case MONTHLY -> "Hàng tháng";
            case QUARTERLY -> "Hàng quý";
            case YEARLY -> "Hàng năm";
        };
    }

    private String mergeTemplate(String templateContent, java.util.Map<String, Object> data) throws Exception {
        Handlebars handlebars = new Handlebars();
        Template template = handlebars.compileInline(templateContent);
        return template.apply(data);
    }

    private byte[] htmlToPdf(String html) throws Exception {
        java.io.ByteArrayOutputStream os = new java.io.ByteArrayOutputStream();
        PdfRendererBuilder builder = new PdfRendererBuilder();
        builder.withHtmlContent(html, null);
        // Nhúng Arial
        builder.useFont(() -> getClass().getResourceAsStream("/fonts/arial.ttf"), "Arial");
        builder.toStream(os);
        builder.run();
        return os.toByteArray();
    }

    // Hàm cũ giữ lại để fallback
    public byte[] generateDefaultContractPdf(Long contractId) {
        Contract contract = contractRepository.findById(contractId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy hợp đồng với mã: " + contractId));
        Room room = contract.getRoom();
        // Lấy snapshot landlord từ ContractLandlordInfo
        java.util.List<com.mpbhms.backend.entity.ContractLandlordInfo> landlordInfos = contractLandlordInfoRepository.findByContractId(contractId);
        String landlordName = "Chưa rõ";
        String landlordPhone = "Chưa rõ";
        String landlordCCCD = "Chưa rõ";
        String landlordAddress = "Chưa rõ";
        if (landlordInfos != null && !landlordInfos.isEmpty()) {
            com.mpbhms.backend.entity.ContractLandlordInfo info = landlordInfos.get(0);
            landlordName = info.getFullName();
            landlordPhone = info.getPhoneNumber();
            landlordCCCD = info.getNationalID();
            landlordAddress = info.getPermanentAddress();
        } else if (room.getLandlord() != null && room.getLandlord().getUserInfo() != null) {
            landlordName = room.getLandlord().getUserInfo().getFullName();
            landlordPhone = room.getLandlord().getUserInfo().getPhoneNumber();
            landlordCCCD = room.getLandlord().getUserInfo().getNationalID();
            landlordAddress = room.getLandlord().getUserInfo().getPermanentAddress();
        }
        // Lấy snapshot người thuê từ ContractRenterInfo
        java.util.List<ContractRenterInfo> renters = contractRenterInfoRepository.findByContractId(contractId);
        if (renters == null || renters.isEmpty()) {
            // Fallback: Lấy từ RoomUser nếu không có ContractRenterInfo
            logger.warn("Không tìm thấy ContractRenterInfo cho hợp đồng {}, fallback sang RoomUser", contractId);
            
            if (contract.getRoomUsers() != null && !contract.getRoomUsers().isEmpty()) {
                renters = new java.util.ArrayList<>();
                for (RoomUser roomUser : contract.getRoomUsers()) {
                    if (roomUser.getUser() != null && roomUser.getUser().getUserInfo() != null) {
                        ContractRenterInfo fallbackInfo = new ContractRenterInfo();
                        fallbackInfo.setFullName(roomUser.getUser().getUserInfo().getFullName());
                        fallbackInfo.setPhoneNumber(roomUser.getUser().getUserInfo().getPhoneNumber());
                        fallbackInfo.setNationalID(roomUser.getUser().getUserInfo().getNationalID());
                        fallbackInfo.setPermanentAddress(roomUser.getUser().getUserInfo().getPermanentAddress());
                        renters.add(fallbackInfo);
                    }
                }
            }
            
            if (renters.isEmpty()) {
                throw new RuntimeException("Không tìm thấy thông tin người thuê cho hợp đồng này. Vui lòng liên hệ quản trị viên để kiểm tra dữ liệu!");
            }
        }

        if (room == null) {
            throw new RuntimeException("Không tìm thấy phòng trong hợp đồng với mã: " + contractId);
        }

        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        Document document = new Document(PageSize.A4, 60, 60, 70, 60);

        try {
            InputStream fontStream = getClass().getResourceAsStream("/fonts/arial.ttf");
            File tempFont = File.createTempFile("arial", ".ttf");
            try (OutputStream out = new FileOutputStream(tempFont)) {
                if (fontStream != null) {
                    fontStream.transferTo(out);
                } else {
                    throw new RuntimeException("Không tìm thấy font arial.ttf trong resource!");
                }
            }
            BaseFont baseFont = BaseFont.createFont(tempFont.getAbsolutePath(), BaseFont.IDENTITY_H, BaseFont.EMBEDDED);
            Font titleFont = new Font(baseFont, 20, Font.BOLD);
            Font sectionHeaderFont = new Font(baseFont, 14, Font.BOLD);
            Font normalFont = new Font(baseFont, 12);
            Font smallBold = new Font(baseFont, 12, Font.BOLD);
            Font smallFont = new Font(baseFont, 10);
            Font headerFont = new Font(baseFont, 13, Font.BOLD);

            PdfWriter.getInstance(document, outputStream);
            document.open();

            // Format
            DateTimeFormatter dateFormatter = DateTimeFormatter.ofPattern("dd/MM/yyyy").withZone(ZoneId.systemDefault());
            DateTimeFormatter fullDateFormatter = DateTimeFormatter.ofPattern("'ngày' dd 'tháng' MM 'năm' yyyy").withZone(ZoneId.systemDefault());
            NumberFormat currencyFormat = NumberFormat.getCurrencyInstance(new Locale("vi", "VN"));

            // Lấy thông tin renter (nhiều người)
            StringBuilder renterInfo = new StringBuilder();
            if (renters != null && !renters.isEmpty()) {
                for (int i = 0; i < renters.size(); i++) {
                    ContractRenterInfo info = renters.get(i);
                    renterInfo.append(String.format(
                        "   + Họ và tên: %s\n   + Số điện thoại: %s\n   + Số CCCD/CMND: %s\n   + Địa chỉ thường trú: %s",
                        info.getFullName(),
                        info.getPhoneNumber(),
                        info.getNationalID(),
                        info.getPermanentAddress()
                    ));
                    if (i < renters.size() - 1) {
                        renterInfo.append("\n\n");
                    }
                }
            } else {
                renterInfo.append("Chưa rõ");
            }

            String roomNumber = room.getRoomNumber() != null ? room.getRoomNumber() : "Không rõ";
            Double rentAmount = contract.getRentAmount() != null ? contract.getRentAmount() : 0.0;
            BigDecimal depositAmount = contract.getDepositAmount() != null ? contract.getDepositAmount() : BigDecimal.ZERO;

            Instant start = contract.getContractStartDate();
            Instant end = contract.getContractEndDate();

            // ============== HEADER ==============
            Paragraph header = new Paragraph("CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM", headerFont);
            header.setAlignment(Element.ALIGN_CENTER);
            document.add(header);

            Paragraph slogan = new Paragraph("Độc lập - Tự do - Hạnh phúc", headerFont);
            slogan.setAlignment(Element.ALIGN_CENTER);
            slogan.setSpacingAfter(20f);
            document.add(slogan);

            Paragraph decorLine = new Paragraph("═════════════════════════════════════════", normalFont);
            decorLine.setAlignment(Element.ALIGN_CENTER);
            decorLine.setSpacingAfter(25f);
            document.add(decorLine);

            // ============== TITLE ==============
            Paragraph contractTitle = new Paragraph("HỢP ĐỒNG THUÊ PHÒNG TRỌ", titleFont);
            contractTitle.setAlignment(Element.ALIGN_CENTER);
            contractTitle.setSpacingAfter(15f);
            document.add(contractTitle);

            // Số hợp đồng và ngày ký
            String contractNumber = contract.getContractNumber() != null ? contract.getContractNumber() : String.format("HD-%s-%05d", java.time.LocalDate.now().getYear(), contract.getId());
            Paragraph contractInfo = new Paragraph("Số hợp đồng: " + contractNumber, smallBold);
            contractInfo.setAlignment(Element.ALIGN_CENTER);
            contractInfo.setSpacingAfter(5f);
            document.add(contractInfo);

            Paragraph signDate = new Paragraph("Ký " + fullDateFormatter.format(LocalDateTime.now()), smallFont);
            signDate.setAlignment(Element.ALIGN_CENTER);
            signDate.setSpacingAfter(20f);
            document.add(signDate);

            // ============== MỞ ĐẦU ==============
            Paragraph intro = new Paragraph(String.format(
                    "Căn cứ Bộ luật Dân sự năm 2015; Luật Nhà ở năm 2014; Nghị định số 99/2015/NĐ-CP " +
                    "ngày 20/10/2015 của Chính phủ quy định chi tiết thi hành một số điều của Luật Nhà ở; " +
                    "các quy định pháp luật có liên quan và thỏa thuận của các bên.\n\n" +
                    "Hôm nay, %s, tại %s, chúng tôi gồm các bên:",
                    fullDateFormatter.format(LocalDateTime.now()),
                    room.getBuilding() != null ? ("tòa nhà " + room.getBuilding() + ", phòng " + roomNumber) : ("phòng " + roomNumber)
            ), normalFont);
            intro.setSpacingAfter(15f);
            intro.setAlignment(Element.ALIGN_JUSTIFIED);
            intro.setLeading(16f);
            document.add(intro);

            // ============== BÊN A - CHO THUÊ ==============
            Paragraph benAHeader = new Paragraph("BÊN CHO THUÊ (BÊN A):", sectionHeaderFont);
            benAHeader.setSpacingAfter(8f);
            document.add(benAHeader);

            Paragraph benAInfo = new Paragraph(String.format(
                    "   + Họ và tên: %s\n" +
                    "   + Số điện thoại: %s\n" +
                    "   + Số CCCD/CMND: %s\n" +
                    "   + Địa chỉ thường trú: %s",
                    landlordName, landlordPhone, landlordCCCD, landlordAddress), normalFont);
            benAInfo.setSpacingAfter(15f);
            benAInfo.setLeading(16f);
            document.add(benAInfo);

            // ============== BÊN B - THUÊ ==============
            Paragraph benBHeader = new Paragraph("BÊN THUÊ PHÒNG (BÊN B):", sectionHeaderFont);
            benBHeader.setSpacingAfter(8f);
            document.add(benBHeader);

            Paragraph benBInfo = new Paragraph(renterInfo.toString(), normalFont);
            benBInfo.setSpacingAfter(20f);
            benBInfo.setLeading(16f);
            document.add(benBInfo);

            Paragraph agreement = new Paragraph(
                    "Sau khi bàn bạc thỏa thuận, hai bên cùng nhau ký kết hợp đồng thuê phòng trọ với những nội dung sau:",
                    normalFont);
            agreement.setSpacingAfter(15f);
            agreement.setAlignment(Element.ALIGN_JUSTIFIED);
            document.add(agreement);

            // ============== ĐIỀU KHOẢN CHI TIẾT ==============
            
            // Điều 1: Đối tượng của hợp đồng
            Paragraph clause1Header = new Paragraph("Điều 1: ĐỐI TƯỢNG CỦA HỢP ĐỒNG", sectionHeaderFont);
            clause1Header.setSpacingAfter(8f);
            document.add(clause1Header);

            String paymentCycleVN = switch (contract.getPaymentCycle() != null ? contract.getPaymentCycle().toString() : "MONTHLY") {
                case "MONTHLY" -> "hàng tháng";
                case "QUARTERLY" -> "hàng quý (3 tháng)";
                case "YEARLY" -> "hàng năm";
                default -> "hàng tháng";
            };

            Paragraph clause1Content = new Paragraph(String.format(
                    "Bên A đồng ý cho Bên B thuê phòng trọ với các thông tin như sau:\n\n" +
                    "   • Số phòng: %s\n" +
                    "   • Địa chỉ: %s\n" +
                    "   • Diện tích: Theo thực tế bàn giao\n" +
                    "   • Mục đích sử dụng: Ở\n" +
                    "   • Tình trạng phòng: Bàn giao theo hiện trạng\n" +
                    "   • Trang thiết bị kèm theo: Theo biên bản bàn giao tài sản",
                    roomNumber,
                    room.getBuilding() != null ? ("Tòa nhà " + room.getBuilding()) : "Địa chỉ nhà trọ"
            ), normalFont);
            clause1Content.setSpacingAfter(15f);
            clause1Content.setLeading(16f);
            document.add(clause1Content);

            // Điều 2: Thời hạn thuê
            Paragraph clause2Header = new Paragraph("Điều 2: THỜI HẠN THUÊ", sectionHeaderFont);
            clause2Header.setSpacingAfter(8f);
            document.add(clause2Header);

            Paragraph clause2Content = new Paragraph(String.format(
                    "   • Thời hạn thuê: Từ ngày %s đến ngày %s\n" +
                    "   • Thời gian thuê: %d tháng\n" +
                    "   • Hợp đồng có hiệu lực kể từ ngày ký",
                    (start != null ? dateFormatter.format(start) : "??"),
                    (end != null ? dateFormatter.format(end) : "??"),
                    start != null && end != null ? java.time.temporal.ChronoUnit.MONTHS.between(
                        start.atZone(ZoneId.systemDefault()).toLocalDate(),
                        end.atZone(ZoneId.systemDefault()).toLocalDate()
                    ) : 0
            ), normalFont);
            clause2Content.setSpacingAfter(15f);
            clause2Content.setLeading(16f);
            document.add(clause2Content);

            // Điều 3: Giá thuê và phương thức thanh toán
            Paragraph clause3Header = new Paragraph("Điều 3: GIÁ THUÊ VÀ PHƯƠNG THỨC THANH TOÁN", sectionHeaderFont);
            clause3Header.setSpacingAfter(8f);
            document.add(clause3Header);

            Paragraph clause3Content = new Paragraph(String.format(
                    "   • Giá thuê phòng: %s/tháng\n" +
                    "   • Tiền đặt cọc: %s (hoàn trả khi kết thúc hợp đồng, không vi phạm)\n" +
                    "   • Chu kỳ thanh toán: %s\n" +
                    "   • Hạn thanh toán: Trước ngày 05 của chu kỳ thanh toán\n" +
                    "   • Phương thức thanh toán: Tiền mặt hoặc chuyển khoản\n" +
                    "   • Các khoản phí khác: Điện, nước, internet, rác... (theo thực tế sử dụng)",
                    currencyFormat.format(rentAmount),
                    currencyFormat.format(depositAmount),
                    paymentCycleVN
            ), normalFont);
            clause3Content.setSpacingAfter(15f);
            clause3Content.setLeading(16f);
            document.add(clause3Content);

            // Điều 4: Quyền và nghĩa vụ của bên cho thuê
            Paragraph clause4Header = new Paragraph("Điều 4: QUYỀN VÀ NGHĨA VỤ CỦA BÊN CHO THUÊ", sectionHeaderFont);
            clause4Header.setSpacingAfter(8f);
            document.add(clause4Header);

            Paragraph clause4Content = new Paragraph(
                    "4.1. Quyền của Bên A:\n" +
                    "   • Yêu cầu Bên B thanh toán đầy đủ, đúng hạn các khoản tiền theo hợp đồng\n" +
                    "   • Yêu cầu Bên B bồi thường thiệt hại do vi phạm hợp đồng gây ra\n" +
                    "   • Đơn phương chấm dứt hợp đồng nếu Bên B vi phạm nghiêm trọng\n" +
                    "   • Kiểm tra tình hình sử dụng phòng trọ (báo trước 24 giờ)\n\n" +
                    "4.2. Nghĩa vụ của Bên A:\n" +
                    "   • Bàn giao phòng trọ đúng tình trạng thỏa thuận\n" +
                    "   • Bảo đảm quyền sử dụng ổn định của Bên B trong thời hạn hợp đồng\n" +
                    "   • Bảo trì, sửa chữa phòng trọ theo thỏa thuận\n" +
                    "   • Hoàn trả tiền đặt cọc khi kết thúc hợp đồng (trừ các khoản vi phạm)",
                    normalFont);
            clause4Content.setSpacingAfter(15f);
            clause4Content.setLeading(16f);
            document.add(clause4Content);

            // Điều 5: Quyền và nghĩa vụ của bên thuê
            Paragraph clause5Header = new Paragraph("Điều 5: QUYỀN VÀ NGHĨA VỤ CỦA BÊN THUÊ", sectionHeaderFont);
            clause5Header.setSpacingAfter(8f);
            document.add(clause5Header);

            Paragraph clause5Content = new Paragraph(
                    "5.1. Quyền của Bên B:\n" +
                    "   • Được sử dụng phòng trọ đúng mục đích đã thỏa thuận\n" +
                    "   • Yêu cầu Bên A sửa chữa những hỏng hóc không do lỗi của mình\n" +
                    "   • Được gia hạn hợp đồng nếu hai bên đồng ý\n\n" +
                    "5.2. Nghĩa vụ của Bên B:\n" +
                    "   • Thanh toán đầy đủ, đúng hạn các khoản tiền theo hợp đồng\n" +
                    "   • Sử dụng phòng trọ đúng mục đích, giữ gìn vệ sinh chung\n" +
                    "   • Tuân thủ quy định về phòng cháy chữa cháy, an ninh trật tự\n" +
                    "   • Bồi thường thiệt hại do mình gây ra\n" +
                    "   • Trả lại phòng trọ khi kết thúc hợp đồng",
                    normalFont);
            clause5Content.setSpacingAfter(15f);
            clause5Content.setLeading(16f);
            document.add(clause5Content);

            // Điều 6: Cam kết chung
            Paragraph clause6Header = new Paragraph("Điều 6: CAM KẾT CHUNG", sectionHeaderFont);
            clause6Header.setSpacingAfter(8f);
            document.add(clause6Header);

            Paragraph clause6Content = new Paragraph(
                    "   • Hai bên cam kết thực hiện đúng và đầy đủ các điều khoản đã thỏa thuận\n" +
                    "   • Trường hợp có tranh chấp, hai bên cùng bàn bạc giải quyết trên tinh thần thiện chí\n" +
                    "   • Nếu không thỏa thuận được, tranh chấp sẽ được giải quyết tại Tòa án có thẩm quyền\n" +
                    "   • Hợp đồng có thể được sửa đổi, bổ sung bằng văn bản khi hai bên đồng ý",
                    normalFont);
            clause6Content.setSpacingAfter(15f);
            clause6Content.setLeading(16f);
            document.add(clause6Content);

            // Nếu có điều khoản bổ sung
            if (contract.getTerms() != null && !contract.getTerms().isEmpty()) {
                Paragraph additionalTermsHeader = new Paragraph("ĐIỀU KHOẢN BỔ SUNG", sectionHeaderFont);
                additionalTermsHeader.setSpacingAfter(8f);
                document.add(additionalTermsHeader);

                for (int i = 0; i < contract.getTerms().size(); i++) {
                    ContractTerm term = contract.getTerms().get(i);
                    Paragraph termPara = new Paragraph(String.format("%d. %s", (i + 1), term.getContent()), normalFont);
                    termPara.setSpacingAfter(5f);
                    termPara.setAlignment(Element.ALIGN_JUSTIFIED);
                    termPara.setLeading(16f);
                    document.add(termPara);
                }
                
                Paragraph additionalTermsEnd = new Paragraph("");
                additionalTermsEnd.setSpacingAfter(15f);
                document.add(additionalTermsEnd);
            }

            // Điều cuối: Hiệu lực của hợp đồng
            Paragraph finalClause = new Paragraph(
                    "Hợp đồng này được lập thành 02 (hai) bản có giá trị pháp lý như nhau, mỗi bên giữ 01 bản.\n" +
                    "Hợp đồng có hiệu lực kể từ ngày ký và chấm dứt theo đúng thỏa thuận.",
                    normalFont);
            finalClause.setSpacingAfter(25f);
            finalClause.setAlignment(Element.ALIGN_JUSTIFIED);
            finalClause.setLeading(16f);
            document.add(finalClause);

            // ============== CHỮ KÝ ==============
            com.lowagie.text.pdf.PdfPTable signTable = new com.lowagie.text.pdf.PdfPTable(2);
            signTable.setWidthPercentage(100);
            signTable.setSpacingBefore(20f);

            com.lowagie.text.pdf.PdfPCell leftSignCell = new com.lowagie.text.pdf.PdfPCell();
            leftSignCell.setBorder(com.lowagie.text.Rectangle.NO_BORDER);
            leftSignCell.setHorizontalAlignment(Element.ALIGN_CENTER);
            leftSignCell.addElement(new Paragraph("BÊN CHO THUÊ (BÊN A)", smallBold));
            leftSignCell.addElement(new Paragraph("(Ký và ghi rõ họ tên)", smallFont));
            leftSignCell.addElement(new Paragraph("\n\n\n", normalFont)); // Khoảng trống cho chữ ký
            leftSignCell.addElement(new Paragraph(landlordName, normalFont));

            com.lowagie.text.pdf.PdfPCell rightSignCell = new com.lowagie.text.pdf.PdfPCell();
            rightSignCell.setBorder(com.lowagie.text.Rectangle.NO_BORDER);
            rightSignCell.setHorizontalAlignment(Element.ALIGN_CENTER);
            rightSignCell.addElement(new Paragraph("BÊN THUÊ PHÒNG (BÊN B)", smallBold));
            rightSignCell.addElement(new Paragraph("(Ký và ghi rõ họ tên)", smallFont));
            rightSignCell.addElement(new Paragraph("\n\n\n", normalFont)); // Khoảng trống cho chữ ký
            if (renters != null && !renters.isEmpty()) {
                rightSignCell.addElement(new Paragraph(renters.get(0).getFullName(), normalFont));
                if (renters.size() > 1) {
                    rightSignCell.addElement(new Paragraph("và " + (renters.size() - 1) + " người khác", smallFont));
                }
            }

            signTable.addCell(leftSignCell);
            signTable.addCell(rightSignCell);
            document.add(signTable);

            document.close();
            return outputStream.toByteArray();

        } catch (Exception e) {
            e.printStackTrace();
            throw new RuntimeException("Không thể tạo PDF", e);
        }
    }

    @Override
    public ResultPaginationDTO getAllContracts(Specification<Contract> spec, Pageable pageable) {
        // Nếu không có filter, thay bằng điều kiện true (conjunction)
        if (spec == null) {
            spec = (root, query, cb) -> cb.conjunction();
        }

        Page<Contract> page = contractRepository.findAll(spec, pageable);

        Meta meta = new Meta();
        meta.setPage(page.getNumber() + 1); // frontend hiển thị bắt đầu từ 1
        meta.setPageSize(page.getSize());
        meta.setPages(page.getTotalPages());
        meta.setTotal(page.getTotalElements());

        ResultPaginationDTO result = new ResultPaginationDTO();
        result.setMeta(meta);
        result.setResult(
                page.getContent().stream().map(this::toDTO).toList()
        );

        return result;
    }



    @Override
    public ContractDTO updateContract(ContractDTO dto) {
        Contract contract = contractRepository.findById(dto.getId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy hợp đồng"));
        
        // Kiểm tra ngày bắt đầu hợp đồng phải lớn hơn hoặc bằng ngày hiện tại
        if (dto.getContractStartDate() != null) {
            java.time.LocalDate currentDate = java.time.LocalDate.now();
            java.time.LocalDate startDate = dto.getContractStartDate().atZone(java.time.ZoneId.systemDefault()).toLocalDate();
            if (startDate.isBefore(currentDate)) {
                throw new RuntimeException("Ngày bắt đầu hợp đồng phải lớn hơn hoặc bằng ngày hiện tại.");
            }
        }
        
        contract.setRoom(new com.mpbhms.backend.entity.Room() {{ setId(dto.getRoomId()); }});
        contract.setContractStartDate(dto.getContractStartDate());
        contract.setContractEndDate(dto.getContractEndDate());
        contract.setContractStatus(dto.getContractStatus());
        contract.setPaymentCycle(dto.getPaymentCycle());
        contract.setDepositAmount(dto.getDepositAmount());
        contract.setRentAmount(dto.getRentAmount());
        contract.setContractImage(dto.getContractImage());
        contract = contractRepository.save(contract);
        
        // Gán contract cho các RoomUser mới
        if (dto.getRoomUserIds() != null) {
            for (Long roomUserId : dto.getRoomUserIds()) {
                RoomUser ru = roomUserRepository.findById(roomUserId).orElseThrow();
                ru.setContract(contract);
                roomUserRepository.save(ru);
            }
        }
        
        // Cập nhật điều khoản hợp đồng theo logic nghiệp vụ chuẩn
        updateContractTerms(contract, dto.getTerms());
        
        return toDTO(contract);
    }

    /**
     * Cập nhật điều khoản hợp đồng theo nghiệp vụ chuẩn
     * - Validate nội dung điều khoản
     * - Tối ưu việc cập nhật thay vì xóa/tạo mới
     * - Theo dõi audit trail
     */
    private void updateContractTerms(Contract contract, java.util.List<String> newTermContents) {
        if (newTermContents == null) {
            newTermContents = new java.util.ArrayList<>();
        }
        
        // Lấy các điều khoản hiện tại
        java.util.List<ContractTerm> currentTerms = contract.getTerms() != null ? 
            new java.util.ArrayList<>(contract.getTerms()) : new java.util.ArrayList<>();
        
        // Validate nội dung điều khoản mới
        for (int i = 0; i < newTermContents.size(); i++) {
            String content = newTermContents.get(i);
            if (content == null || content.trim().isEmpty()) {
                throw new RuntimeException("Điều khoản thứ " + (i + 1) + " không được để trống");
            }
            if (content.trim().length() < 10) {
                throw new RuntimeException("Điều khoản thứ " + (i + 1) + " quá ngắn (tối thiểu 10 ký tự)");
            }
            if (content.trim().length() > 200) {
                throw new RuntimeException("Điều khoản thứ " + (i + 1) + " quá dài (tối đa 200 ký tự)");
            }
        }
        
        String currentUser = getCurrentUsername();
        
        // Cập nhật hoặc tạo mới điều khoản
        for (int i = 0; i < newTermContents.size(); i++) {
            String content = newTermContents.get(i).trim();
            
            if (i < currentTerms.size()) {
                // Cập nhật điều khoản hiện có
                ContractTerm existingTerm = currentTerms.get(i);
                if (!content.equals(existingTerm.getContent())) {
                    existingTerm.setContent(content);
                    existingTerm.setTermOrder(i + 1);
                    existingTerm.setUpdatedBy(currentUser);
                    contractTermRepository.save(existingTerm);
                }
            } else {
                // Tạo điều khoản mới
                ContractTerm newTerm = new ContractTerm();
                newTerm.setContract(contract);
                newTerm.setContent(content);
                newTerm.setTermOrder(i + 1);
                newTerm.setCreatedBy(currentUser);
                newTerm.setUpdatedBy(currentUser);
                newTerm.setTermCategory(ContractTerm.TermCategory.GENERAL);
                newTerm.setIsMandatory(false);
                contractTermRepository.save(newTerm);
            }
        }
        
        // Xóa các điều khoản thừa (nếu số điều khoản mới ít hơn hiện tại)
        for (int i = newTermContents.size(); i < currentTerms.size(); i++) {
            ContractTerm termToDelete = currentTerms.get(i);
            contractTermRepository.delete(termToDelete);
        }
    }
    
    /**
     * Tạo điều khoản mặc định cho hợp đồng mới
     */
    private void createDefaultTermsForContract(Contract contract, java.util.List<String> customTerms) {
        String currentUser = getCurrentUsername();
        java.util.List<String> allTerms = new java.util.ArrayList<>();
        
        // Thêm điều khoản mặc định bắt buộc
        allTerms.addAll(getDefaultMandatoryTerms());
        
        // Thêm điều khoản tùy chỉnh
        if (customTerms != null && !customTerms.isEmpty()) {
            for (String customTerm : customTerms) {
                if (customTerm != null && !customTerm.trim().isEmpty()) {
                    allTerms.add(customTerm.trim());
                }
            }
        }
        
        // Tạo các điều khoản
        for (int i = 0; i < allTerms.size(); i++) {
            String content = allTerms.get(i);
            
            ContractTerm term = new ContractTerm();
            term.setContract(contract);
            term.setContent(content);
            term.setTermOrder(i + 1);
            term.setCreatedBy(currentUser);
            term.setUpdatedBy(currentUser);
            
            // Phân loại điều khoản
            if (i < getDefaultMandatoryTerms().size()) {
                term.setIsMandatory(true);
                term.setTermCategory(categorizeTermContent(content));
            } else {
                term.setIsMandatory(false);
                term.setTermCategory(ContractTerm.TermCategory.SPECIAL);
            }
            
            contractTermRepository.save(term);
        }
    }
    
    /**
     * Lấy danh sách điều khoản mặc định bắt buộc
     */
    private java.util.List<String> getDefaultMandatoryTerms() {
        return java.util.Arrays.asList(
            "Bên B cam kết sử dụng phòng đúng mục đích ở và không làm ảnh hưởng đến việc sinh hoạt của những người xung quanh.",
            "Bên B có trách nhiệm giữ gìn vệ sinh chung, không xả rác bừa bãi và tuân thủ các quy định về an ninh trật tự.",
            "Bên B phải thanh toán đầy đủ và đúng hạn các khoản tiền thuê phòng theo thỏa thuận.",
            "Mọi thiệt hại do lỗi của Bên B gây ra, Bên B phải chịu trách nhiệm bồi thường theo giá thị trường.",
            "Khi hết hạn hợp đồng hoặc chấm dứt hợp đồng, Bên B phải bàn giao lại phòng trong tình trạng ban đầu."
        );
    }
    
    /**
     * Phân loại nội dung điều khoản
     */
    private ContractTerm.TermCategory categorizeTermContent(String content) {
        String lowerContent = content.toLowerCase();
        
        if (lowerContent.contains("thanh toán") || lowerContent.contains("tiền") || lowerContent.contains("phí")) {
            return ContractTerm.TermCategory.PAYMENT;
        } else if (lowerContent.contains("sử dụng") || lowerContent.contains("mục đích")) {
            return ContractTerm.TermCategory.USAGE;
        } else if (lowerContent.contains("bảo trì") || lowerContent.contains("sửa chữa")) {
            return ContractTerm.TermCategory.MAINTENANCE;
        } else if (lowerContent.contains("an ninh") || lowerContent.contains("trật tự")) {
            return ContractTerm.TermCategory.SECURITY;
        } else if (lowerContent.contains("chấm dứt") || lowerContent.contains("kết thúc")) {
            return ContractTerm.TermCategory.TERMINATION;
        } else {
            return ContractTerm.TermCategory.GENERAL;
        }
    }
    
    /**
     * Lấy username hiện tại để audit
     */
    private String getCurrentUsername() {
        try {
            return SecurityUtil.getCurrentUserLogin().orElse("system");
        } catch (Exception e) {
            return "system";
        }
    }

    @Override
    public void deleteContract(Long id) {
        Contract contract = contractRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy hợp đồng"));
        // Xóa tất cả ContractRenterInfo liên quan
        java.util.List<ContractRenterInfo> renterInfos = contractRenterInfoRepository.findByContractId(id);
        for (ContractRenterInfo info : renterInfos) {
            contractRenterInfoRepository.delete(info);
        }
        // Xóa tất cả RoomUser liên quan
        if (contract.getRoomUsers() != null) {
            for (RoomUser ru : contract.getRoomUsers()) {
                roomUserRepository.delete(ru);
            }
        }
        contractRepository.deleteById(id);
    }

    @Override
    public ContractDTO createContract(ContractDTO dto) {
        // Check if the room already has an ACTIVE contract
        if (dto.getRoomId() != null) {
            java.util.List<Contract> activeContracts = contractRepository.findByRoomIdAndContractStatus(dto.getRoomId(), com.mpbhms.backend.enums.ContractStatus.ACTIVE);
            if (!activeContracts.isEmpty()) {
                throw new RuntimeException("Phòng này đã có hợp đồng đang hoạt động. Không thể tạo hợp đồng mới.");
            }
        }
        
        // Kiểm tra ngày bắt đầu hợp đồng phải lớn hơn hoặc bằng ngày hiện tại
        if (dto.getContractStartDate() != null) {
            java.time.LocalDate currentDate = java.time.LocalDate.now();
            java.time.LocalDate startDate = dto.getContractStartDate().atZone(java.time.ZoneId.systemDefault()).toLocalDate();
            if (startDate.isBefore(currentDate)) {
                throw new RuntimeException("Ngày bắt đầu hợp đồng phải lớn hơn hoặc bằng ngày hiện tại.");
            }
        }
        
        Contract contract = new Contract();
        contract.setRoom(new com.mpbhms.backend.entity.Room() {{ setId(dto.getRoomId()); }});
        contract.setContractStartDate(dto.getContractStartDate());
        contract.setContractEndDate(dto.getContractEndDate());
        contract.setContractStatus(dto.getContractStatus());
        contract.setPaymentCycle(dto.getPaymentCycle());
        contract.setDepositAmount(dto.getDepositAmount());
        contract.setRentAmount(dto.getRentAmount());
        contract.setContractImage(dto.getContractImage());
        contract = contractRepository.save(contract);
        // Sinh số hợp đồng tự động
        String year = java.time.LocalDate.now().getYear() + "";
        String contractNumber = String.format("HD-%s-%05d", year, contract.getId());
        contract.setContractNumber(contractNumber);
        contract = contractRepository.save(contract);
        // Gán contract cho các RoomUser
        if (dto.getRoomUserIds() != null) {
            for (Long roomUserId : dto.getRoomUserIds()) {
                RoomUser ru = roomUserRepository.findById(roomUserId).orElseThrow();
                ru.setContract(contract);
                roomUserRepository.save(ru);
                // Lưu snapshot thông tin renter vào ContractRenterInfo
                if (ru.getUser() != null && ru.getUser().getUserInfo() != null) {
                    ContractRenterInfo info = new ContractRenterInfo();
                    info.setContract(contract);
                    info.setFullName(ru.getUser().getUserInfo().getFullName());
                    info.setPhoneNumber(ru.getUser().getUserInfo().getPhoneNumber());
                    info.setNationalID(ru.getUser().getUserInfo().getNationalID());
                    info.setPermanentAddress(ru.getUser().getUserInfo().getPermanentAddress());
                    info.setEmail(ru.getUser().getEmail()); // Thêm email
                    contractRenterInfoRepository.save(info);
                }
            }
        }
        // Lưu snapshot thông tin landlord vào ContractLandlordInfo
        if (contract.getRoom() != null && contract.getRoom().getLandlord() != null && contract.getRoom().getLandlord().getId() != null) {
            User landlord = userRepository.findById(contract.getRoom().getLandlord().getId()).orElse(null);
            if (landlord != null && landlord.getUserInfo() != null) {
                com.mpbhms.backend.entity.ContractLandlordInfo landlordInfo = new com.mpbhms.backend.entity.ContractLandlordInfo();
                landlordInfo.setContract(contract);
                landlordInfo.setFullName(landlord.getUserInfo().getFullName());
                landlordInfo.setPhoneNumber(landlord.getUserInfo().getPhoneNumber());
                landlordInfo.setNationalID(landlord.getUserInfo().getNationalID());
                landlordInfo.setPermanentAddress(landlord.getUserInfo().getPermanentAddress());
                contractLandlordInfoRepository.save(landlordInfo);
            }
        }
        // Lưu các điều khoản hợp đồng với logic nghiệp vụ chuẩn
        createDefaultTermsForContract(contract, dto.getTerms());
        return toDTO(contract);
    }

    // Hàm tự động cập nhật thông tin user mỗi tháng cho tất cả hợp đồng active
    @Scheduled(cron = "0 0 0 1 * ?") // Chạy vào 0h ngày 1 hàng tháng
    public void updateUserInfoMonthly() {
        // Lấy tất cả hợp đồng active
        java.util.List<Contract> activeContracts = contractRepository.findAll().stream()
            .filter(contract -> contract.getContractStatus() == com.mpbhms.backend.enums.ContractStatus.ACTIVE)
            .toList();
            
        for (Contract contract : activeContracts) {
            // Lấy RoomUser còn tồn tại (đã xóa hẳn những người rời phòng)
            java.util.List<RoomUser> activeUsers = contract.getRoomUsers() != null ? contract.getRoomUsers() : java.util.Collections.emptyList();
            if (activeUsers.isEmpty()) continue;
            
            // Cập nhật thông tin user cho từng người thuê
            for (RoomUser ru : activeUsers) {
                if (ru.getUser() != null && ru.getUser().getUserInfo() != null) {
                    // Tìm ContractRenterInfo hiện tại của user này
                    java.util.List<ContractRenterInfo> existingInfos = contractRenterInfoRepository.findByContractId(contract.getId());
                    ContractRenterInfo existingInfo = null;
                    
                    // Tìm thông tin hiện tại của user này (dựa trên tên và số điện thoại)
                    for (ContractRenterInfo info : existingInfos) {
                        if (ru.getUser().getUserInfo().getFullName().equals(info.getFullName()) &&
                            ru.getUser().getUserInfo().getPhoneNumber().equals(info.getPhoneNumber())) {
                            existingInfo = info;
                            break;
                        }
                    }
                    
                    // Nếu tìm thấy thông tin cũ, cập nhật; nếu không tìm thấy, tạo mới
                    if (existingInfo != null) {
                        // Cập nhật thông tin mới nhất
                        existingInfo.setFullName(ru.getUser().getUserInfo().getFullName());
                        existingInfo.setPhoneNumber(ru.getUser().getUserInfo().getPhoneNumber());
                        existingInfo.setNationalID(ru.getUser().getUserInfo().getNationalID());
                        existingInfo.setPermanentAddress(ru.getUser().getUserInfo().getPermanentAddress());
                        existingInfo.setEmail(ru.getUser().getEmail()); // Thêm email
                        contractRenterInfoRepository.save(existingInfo);
                        
                        logger.info("[UpdateUserInfo] Updated user info for {} in contract {} (room {})", 
                            ru.getUser().getUserInfo().getFullName(), contract.getId(), contract.getRoom().getRoomNumber());
                    } else {
                        // Tạo mới thông tin nếu chưa có
                        ContractRenterInfo newInfo = new ContractRenterInfo();
                        newInfo.setContract(contract);
                        newInfo.setFullName(ru.getUser().getUserInfo().getFullName());
                        newInfo.setPhoneNumber(ru.getUser().getUserInfo().getPhoneNumber());
                        newInfo.setNationalID(ru.getUser().getUserInfo().getNationalID());
                        newInfo.setPermanentAddress(ru.getUser().getUserInfo().getPermanentAddress());
                        newInfo.setEmail(ru.getUser().getEmail()); // Thêm email
                        contractRenterInfoRepository.save(newInfo);
                        
                        logger.info("[UpdateUserInfo] Created new user info for {} in contract {} (room {})", 
                            ru.getUser().getUserInfo().getFullName(), contract.getId(), contract.getRoom().getRoomNumber());
                    }
                }
            }
            
            // Gửi thông báo cho chủ phòng về việc cập nhật thông tin
            if (contract.getRoom() != null && contract.getRoom().getLandlord() != null && contract.getRoom().getLandlord().getEmail() != null) {
                String subject = "Cập nhật thông tin người thuê - Phòng " + contract.getRoom().getRoomNumber();
                String content = "Thông tin người thuê trong phòng " + contract.getRoom().getRoomNumber() + 
                               " đã được cập nhật tự động. Vui lòng kiểm tra trên hệ thống.";
                
                NotificationDTO landlordNoti = new NotificationDTO();
                landlordNoti.setTitle(subject);
                landlordNoti.setMessage(content);
                landlordNoti.setType(NotificationType.CUSTOM);
                landlordNoti.setRecipientId(contract.getRoom().getLandlord().getId());
                notificationService.createAndSend(landlordNoti);
                emailService.sendNotificationEmail(contract.getRoom().getLandlord().getEmail(), subject, content);
            }
        }
        
        logger.info("[UpdateUserInfo] Successfully updated user info for {} contracts", activeContracts.size());
    }

    private ContractDTO toDTO(Contract contract) {
        // Đảm bảo ContractRenterInfo tồn tại trước khi chuyển đổi
        ensureContractRenterInfoExists(contract);
        ContractDTO dto = new ContractDTO();
        dto.setId(contract.getId());
        dto.setRoomId(contract.getRoom().getId());
        if (contract.getRoom() != null) {
            dto.setRoomNumber(contract.getRoom().getRoomNumber());
        }
        dto.setContractStartDate(contract.getContractStartDate());
        dto.setContractEndDate(contract.getContractEndDate());
        dto.setContractStatus(contract.getContractStatus());
        dto.setPaymentCycle(contract.getPaymentCycle());
        dto.setDepositAmount(contract.getDepositAmount());
        dto.setRentAmount(contract.getRentAmount());
        // Map roomUsers sang RoomUserDTO
        if (contract.getRoomUsers() != null && !contract.getRoomUsers().isEmpty()) {
            // Nếu có RoomUser hiện tại, sử dụng thông tin từ đó
            java.util.List<com.mpbhms.backend.dto.RoomUserDTO> roomUserDTOs = new java.util.ArrayList<>();
            for (com.mpbhms.backend.entity.RoomUser ru : contract.getRoomUsers()) {
                com.mpbhms.backend.dto.RoomUserDTO rudto = new com.mpbhms.backend.dto.RoomUserDTO();
                if (ru.getUser() != null) {
                    rudto.setUserId(ru.getUser().getId());
                    rudto.setEmail(ru.getUser().getEmail());
                    if (ru.getUser().getUserInfo() != null) {
                        rudto.setFullName(ru.getUser().getUserInfo().getFullName());
                        rudto.setPhoneNumber(ru.getUser().getUserInfo().getPhoneNumber());
                    }
                }
                rudto.setJoinedAt(ru.getJoinedAt());
                rudto.setIsActive(ru.getIsActive());
                roomUserDTOs.add(rudto);
            }
            dto.setRoomUsers(roomUserDTOs);
        } else {
            // Nếu không có RoomUser hiện tại, lấy thông tin từ ContractRenterInfo (cho hợp đồng cũ đã được cập nhật)
            java.util.List<ContractRenterInfo> renterInfos = contractRenterInfoRepository.findByContractId(contract.getId());
            if (renterInfos != null && !renterInfos.isEmpty()) {
                java.util.List<com.mpbhms.backend.dto.RoomUserDTO> roomUserDTOs = new java.util.ArrayList<>();
                for (ContractRenterInfo renterInfo : renterInfos) {
                    com.mpbhms.backend.dto.RoomUserDTO rudto = new com.mpbhms.backend.dto.RoomUserDTO();
                    rudto.setFullName(renterInfo.getFullName());
                    rudto.setPhoneNumber(renterInfo.getPhoneNumber());
                    rudto.setEmail(renterInfo.getEmail());
                    rudto.setIsActive(false); // Đánh dấu là thông tin lịch sử
                    roomUserDTOs.add(rudto);
                }
                dto.setRoomUsers(roomUserDTOs);
            }
        }
        if (contract.getRoom() != null) {
            dto.setMaxOccupants(contract.getRoom().getMaxOccupants());
        }
        // Thêm danh sách điều khoản
        if (contract.getTerms() != null) {
            java.util.List<String> terms = contract.getTerms().stream()
                .map(com.mpbhms.backend.entity.ContractTerm::getContent)
                .collect(java.util.stream.Collectors.toList());
            dto.setTerms(terms);
        }
        dto.setCreatedDate(contract.getCreatedDate());
        dto.setUpdatedDate(contract.getUpdatedDate());
        return dto;
    }

    @Override
    @Transactional
    public void processExpiredContracts() {
        java.time.Instant now = java.time.Instant.now();
        
        // Tìm tất cả hợp đồng ACTIVE đã hết hạn
        java.util.List<Contract> expiredContracts = contractRepository.findByContractStatusAndContractEndDateBefore(
            com.mpbhms.backend.enums.ContractStatus.ACTIVE, now);
        
        for (Contract contract : expiredContracts) {
            try {
                // Đánh dấu hợp đồng là EXPIRED
                contract.setContractStatus(com.mpbhms.backend.enums.ContractStatus.EXPIRED);
                contractRepository.save(contract);
                
                // Cập nhật trạng thái phòng thành Available
                Room room = contract.getRoom();
                if (room != null) {
                    roomService.updateRoomStatus(room.getId(), RoomStatus.Available.name());
                }
                
                // Gửi thông báo cho người thuê
                sendExpirationNotifications(contract);
                
                logger.info("Đã xử lý hợp đồng hết hạn: {}", contract.getId());
            } catch (Exception e) {
                logger.error("Error processing expired contract {}: {}", contract.getId(), e.getMessage());
            }
        }
    }
    
    @Override
    @Transactional
    public void renewContract(Long contractId, java.time.Instant newEndDate) {
        Contract contract = contractRepository.findById(contractId)
            .orElseThrow(() -> new RuntimeException("Không tìm thấy hợp đồng"));
        java.time.Instant now = java.time.Instant.now();
        java.time.Duration duration = java.time.Duration.between(now, contract.getContractEndDate());
        boolean isWithin30Days = !contract.getContractEndDate().isBefore(now) && duration.toDays() <= 30;
        if (!(contract.getContractStatus() == com.mpbhms.backend.enums.ContractStatus.EXPIRED ||
              (contract.getContractStatus() == com.mpbhms.backend.enums.ContractStatus.ACTIVE && isWithin30Days))) {
            throw new RuntimeException("Chỉ có thể gia hạn hợp đồng đã hết hạn hoặc còn dưới 30 ngày đến ngày kết thúc");
        }
        // Gia hạn hợp đồng
        contract.setContractEndDate(newEndDate);
        contract.setContractStatus(com.mpbhms.backend.enums.ContractStatus.ACTIVE);
        contractRepository.save(contract);
        // Cập nhật trạng thái phòng
        Room room = contract.getRoom();
        if (room != null) {
            roomService.updateRoomStatus(room.getId(), RoomStatus.Occupied.name());
        }
        // Gửi thông báo gia hạn
        sendRenewalNotifications(contract);
        // Xóa contract khỏi cache notification để có thể gửi thông báo mới khi sắp hết hạn
        contractNotificationScheduler.removeContractFromCache(contractId);
    }
    
    @Override
    public ResultPaginationDTO getExpiringContracts(Pageable pageable) {
        java.time.Instant thirtyDaysFromNow = java.time.Instant.now().plusSeconds(30 * 24 * 60 * 60);
        
        Page<Contract> contractsPage = contractRepository.findByContractStatusAndContractEndDateBetween(
            com.mpbhms.backend.enums.ContractStatus.ACTIVE,
            java.time.Instant.now(),
            thirtyDaysFromNow,
            pageable
        );
        
        java.util.List<ContractDTO> contractDTOs = contractsPage.getContent().stream()
            .map(this::toDTO)
            .collect(java.util.stream.Collectors.toList());
        
        com.mpbhms.backend.dto.Meta meta = new com.mpbhms.backend.dto.Meta();
        meta.setPage(contractsPage.getNumber() + 1);
        meta.setPageSize(contractsPage.getSize());
        meta.setPages(contractsPage.getTotalPages());
        meta.setTotal(contractsPage.getTotalElements());
        
        ResultPaginationDTO result = new ResultPaginationDTO();
        result.setMeta(meta);
        result.setResult(contractDTOs);
        
        return result;
    }
    
    /**
     * Gửi thông báo cho người thuê khi hợp đồng hết hạn
     */
    private void sendExpirationNotifications(Contract contract) {
        if (contract.getRoomUsers() != null) {
            for (RoomUser roomUser : contract.getRoomUsers()) {
                if (roomUser.getIsActive() && roomUser.getUser() != null) {
                    // Notification for contract expiration
                    NotificationDTO notification = new NotificationDTO();
                    notification.setRecipientId(roomUser.getUser().getId());
                    notification.setTitle("Hợp đồng đã hết hạn");
                    notification.setMessage(String.format(
                        "Contract for room %s has expired on %s. Please contact the landlord to renew.",
                        contract.getRoom().getRoomNumber(),
                        java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy")
                            .format(contract.getContractEndDate().atZone(java.time.ZoneId.systemDefault()))
                    ));
                    notification.setType(com.mpbhms.backend.enums.NotificationType.ANNOUNCEMENT);
                    
                    try {
                        notificationService.createAndSend(notification);
                    } catch (Exception e) {
                        logger.error("Error sending expiration notification: {}", e.getMessage());
                    }
                }
            }
        }
    }
    
    /**
     * Gửi thông báo khi hợp đồng được gia hạn
     */
    private void sendRenewalNotifications(Contract contract) {
        if (contract.getRoomUsers() != null) {
            for (RoomUser roomUser : contract.getRoomUsers()) {
                if (roomUser.getIsActive() && roomUser.getUser() != null) {
                    NotificationDTO notification = new NotificationDTO();
                    notification.setRecipientId(roomUser.getUser().getId());
                    notification.setTitle("Hợp đồng đã được gia hạn");
                    notification.setMessage(String.format(
                        "Hợp đồng phòng %s đã được gia hạn đến ngày %s.",
                        contract.getRoom().getRoomNumber(),
                        java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy")
                            .format(contract.getContractEndDate().atZone(java.time.ZoneId.systemDefault()))
                    ));
                    notification.setType(com.mpbhms.backend.enums.NotificationType.ANNOUNCEMENT);
                    
                    try {
                        notificationService.createAndSend(notification);
                    } catch (Exception e) {
                        logger.error("Error sending renewal notification: {}", e.getMessage());
                    }
                }
            }
        }
        
        // Gửi thông báo cho landlord
        if (contract.getRoom() != null && contract.getRoom().getLandlord() != null) {
            NotificationDTO notification = new NotificationDTO();
            notification.setRecipientId(contract.getRoom().getLandlord().getId());
            notification.setTitle("Hợp đồng đã được gia hạn");
            notification.setMessage(String.format(
                "Hợp đồng phòng %s đã được gia hạn đến ngày %s.",
                contract.getRoom().getRoomNumber(),
                java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy")
                    .format(contract.getContractEndDate().atZone(java.time.ZoneId.systemDefault()))
            ));
            notification.setType(com.mpbhms.backend.enums.NotificationType.ANNOUNCEMENT);
            
            try {
                notificationService.createAndSend(notification);
            } catch (Exception e) {
                logger.error("Error sending renewal notification to landlord: {}", e.getMessage());
            }
        }
    }
    
    /**
     * Scheduled task để xử lý hợp đồng hết hạn hàng ngày
     */
    @org.springframework.scheduling.annotation.Scheduled(cron = "0 0 1 * * ?") // Chạy lúc 1h sáng hàng ngày
    public void processExpiredContractsScheduled() {
        logger.info("Starting scheduled task to process expired contracts");
        processExpiredContracts();
        logger.info("Completed scheduled task to process expired contracts");
    }

    @Override
    @Transactional
    public void updateContract(UpdateContractRequest request) {
        Contract contract = contractRepository.findById(request.getContractId())
            .orElseThrow(() -> new RuntimeException("Không tìm thấy hợp đồng"));
        Long currentUserId = SecurityUtil.getCurrentUserId();
        if (!contract.getRoom().getLandlord().getId().equals(currentUserId)) {
            throw new RuntimeException("Chỉ chủ phòng mới được cập nhật hợp đồng");
        }

        // ✅ VALIDATE: Ngày kết thúc mới phải là tương lai
        if (request.getNewEndDate() != null) {
            java.time.Instant currentTime = java.time.Instant.now();
            if (request.getNewEndDate().isBefore(currentTime)) {
                throw new RuntimeException("Ngày kết thúc mới phải là ngày trong tương lai");
            }
            
            // ✅ VALIDATE: Ngày kết thúc mới phải sau ngày hiện tại ít nhất 1 ngày
            java.time.Instant tomorrow = currentTime.plus(java.time.Duration.ofDays(1));
            if (request.getNewEndDate().isBefore(tomorrow)) {
                throw new RuntimeException("Ngày kết thúc mới phải sau ngày hiện tại ít nhất 1 ngày");
            }
            
            // ✅ VALIDATE: Ngày kết thúc mới phải sau ngày bắt đầu hợp đồng
            if (request.getNewEndDate().isBefore(contract.getContractStartDate())) {
                throw new RuntimeException("Ngày kết thúc mới không thể trước ngày bắt đầu hợp đồng (" + 
                    contract.getContractStartDate().toString() + ")");
            }
            
            logger.info("Validated new end date: {} (current contract end date: {})", 
                request.getNewEndDate(), contract.getContractEndDate());
        }

        // Kiểm tra xem có thay đổi quan trọng không (tiền thuê, tiền cọc, ngày kết thúc, người thuê, điều khoản, chu kỳ thanh toán)
        boolean hasSignificantChanges = request.getNewRentAmount() != null || 
                                       request.getNewDepositAmount() != null || 
                                       request.getNewEndDate() != null || 
                                       (request.getRenterIds() != null && !request.getRenterIds().isEmpty()) ||
                                       request.getNewTerms() != null ||
                                       request.getPaymentCycle() != null;

        // Tất cả thay đổi đều cần tạo amendment để có lịch sử
        if (!hasSignificantChanges) {
            return; // Không có thay đổi gì
        }

        // Nếu có thay đổi quan trọng, tạo amendment
        java.util.List<Long> renterIds = contract.getRoomUsers().stream()
            .filter(RoomUser::getIsActive)
            .map(ru -> ru.getUser().getId())
            .collect(java.util.stream.Collectors.toList());

        // Tạo mô tả chi tiết thay đổi
        StringBuilder oldValueBuilder = new StringBuilder();
        StringBuilder newValueBuilder = new StringBuilder();
        
        if (request.getNewRentAmount() != null) {
            // So sánh chính xác bằng cách chuyển về BigDecimal
            java.math.BigDecimal currentRent = new java.math.BigDecimal(contract.getRentAmount().toString());
            java.math.BigDecimal newRent = new java.math.BigDecimal(request.getNewRentAmount().toString());
            boolean hasRentChange = currentRent.compareTo(newRent) != 0;
            
            if (hasRentChange) {
                oldValueBuilder.append("Tiền thuê: ").append(contract.getRentAmount()).append(" VND; ");
                newValueBuilder.append("Tiền thuê: ").append(request.getNewRentAmount()).append(" VND; ");
            }
        }
        
        if (request.getNewDepositAmount() != null) {
            // So sánh chính xác bằng cách chuyển về BigDecimal
            java.math.BigDecimal currentDeposit = new java.math.BigDecimal(contract.getDepositAmount().toString());
            java.math.BigDecimal newDeposit = new java.math.BigDecimal(request.getNewDepositAmount().toString());
            boolean hasDepositChange = currentDeposit.compareTo(newDeposit) != 0;
            
            if (hasDepositChange) {
                oldValueBuilder.append("Tiền cọc: ").append(contract.getDepositAmount()).append(" VND; ");
                newValueBuilder.append("Tiền cọc: ").append(request.getNewDepositAmount()).append(" VND; ");
                logger.info("Deposit change detected in oldValue/newValue - Current: {}, New: {}", contract.getDepositAmount(), request.getNewDepositAmount());
            } else {
                logger.info("No deposit change in oldValue/newValue - Current: {}, New: {}", contract.getDepositAmount(), request.getNewDepositAmount());
            }
        }
        
        if (request.getNewEndDate() != null) {
            boolean hasEndDateChange = !request.getNewEndDate().equals(contract.getContractEndDate());
            
            if (hasEndDateChange) {
                oldValueBuilder.append("Ngày kết thúc: ").append(contract.getContractEndDate().atZone(java.time.ZoneId.systemDefault()).toLocalDate().format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy"))).append("; ");
                newValueBuilder.append("Ngày kết thúc: ").append(request.getNewEndDate().atZone(java.time.ZoneId.systemDefault()).toLocalDate().format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy"))).append("; ");
                logger.info("End date change detected in oldValue/newValue - Current: {}, New: {}", contract.getContractEndDate(), request.getNewEndDate());
            } else {
                logger.info("No end date change in oldValue/newValue - Current: {}, New: {}", contract.getContractEndDate(), request.getNewEndDate());
            }
        }
        
            if (request.getPaymentCycle() != null) {
            boolean hasPaymentCycleChange = !request.getPaymentCycle().equals(contract.getPaymentCycle());
            
            if (hasPaymentCycleChange) {
                oldValueBuilder.append("Chu kỳ thanh toán: ").append(localizePaymentCycle(contract.getPaymentCycle())).append("; ");
                newValueBuilder.append("Chu kỳ thanh toán: ").append(localizePaymentCycle(request.getPaymentCycle())).append("; ");
                logger.info("Payment cycle change detected in oldValue/newValue - Current: {}, New: {}", contract.getPaymentCycle(), request.getPaymentCycle());
            } else {
                logger.info("No payment cycle change in oldValue/newValue - Current: {}, New: {}", contract.getPaymentCycle(), request.getPaymentCycle());
            }
        }
        
        // Xử lý thay đổi điều khoản
        if (request.getNewTerms() != null) {
            // Lấy điều khoản hiện tại
            java.util.List<String> currentTerms = contract.getTerms() != null ? 
                contract.getTerms().stream()
                    .map(ContractTerm::getContent)
                    .collect(java.util.stream.Collectors.toList()) : 
                new java.util.ArrayList<>();
            
            // So sánh với điều khoản mới
            boolean hasTermsChange = !currentTerms.equals(request.getNewTerms());
            
            if (hasTermsChange) {
                // Chuẩn hóa điều khoản hiện tại
                String currentTermsStr;
                if (currentTerms.isEmpty()) {
                    currentTermsStr = "Không có điều khoản";
                } else {
                    currentTermsStr = "Điều khoản: " + String.join(" | ", currentTerms);
                }
                
                // Chuẩn hóa điều khoản mới
                String newTermsStr;
                if (request.getNewTerms().isEmpty()) {
                    newTermsStr = "Không có điều khoản";
                } else {
                    newTermsStr = "Điều khoản: " + String.join(" | ", request.getNewTerms());
                }
                
                // Chỉ thêm vào nếu thực sự khác nhau
                if (!currentTermsStr.equals(newTermsStr)) {
                    oldValueBuilder.append(currentTermsStr).append("; ");
                    newValueBuilder.append(newTermsStr).append("; ");
                }
            }
        }
        
        // Xử lý thay đổi người thuê
        if (request.getRenterIds() != null) {
            if (request.getRenterIds().isEmpty()) {
                throw new RuntimeException("Không thể xóa hết người thuê: Hợp đồng phải còn ít nhất 1 người.");
            }
            // Lấy danh sách người thuê hiện tại
            java.util.List<Long> currentRenterIds = contract.getRoomUsers().stream()
            .filter(RoomUser::getIsActive)
            .map(ru -> ru.getUser().getId())
            .collect(java.util.stream.Collectors.toList());
            
            java.util.List<Long> newRenterIds = request.getRenterIds() != null ? request.getRenterIds() : new java.util.ArrayList<>();
            
            currentRenterIds.sort(java.util.Comparator.naturalOrder());
            newRenterIds.sort(java.util.Comparator.naturalOrder());
            
            boolean hasRenterChange = !currentRenterIds.equals(newRenterIds);
            
            // Không cho phép cập nhật khiến số người thuê còn lại < 1
            if (request.getRenterIds() != null && newRenterIds.size() < 1) {
                throw new RuntimeException("Hợp đồng phải có ít nhất 1 người thuê.");
            }
            if (hasRenterChange) {
                // Lấy danh sách người thuê hiện tại
                java.util.List<String> currentRenterNames = contract.getRoomUsers().stream()
                    .filter(RoomUser::getIsActive)
                    .map(ru -> ru.getUser().getUserInfo() != null ? ru.getUser().getUserInfo().getFullName() : "Không có tên")
                    .collect(java.util.stream.Collectors.toList());
                
                // Lấy danh sách người thuê mới
                java.util.List<String> newRenterNames = new java.util.ArrayList<>();
                if (!request.getRenterIds().isEmpty()) {
                    newRenterNames = request.getRenterIds().stream()
                        .map(id -> userRepository.findById(id).orElse(null))
                        .filter(user -> user != null)
                        .map(user -> user.getUserInfo() != null ? user.getUserInfo().getFullName() : "Không có tên")
                        .collect(java.util.stream.Collectors.toList());
                }
                
                String currentRentersStr = currentRenterNames.isEmpty() ? "Không có người thuê" : 
                    "Người thuê: " + String.join(", ", currentRenterNames);
                String newRentersStr = newRenterNames.isEmpty() ? "Không có người thuê" : 
                    "Người thuê: " + String.join(", ", newRenterNames);
                
                oldValueBuilder.append(currentRentersStr).append("; ");
                newValueBuilder.append(newRentersStr).append("; ");
            }
        }
        
        // Nếu không có thay đổi cụ thể, sử dụng mô tả chung
        String oldValue = oldValueBuilder.length() > 0 ? oldValueBuilder.toString() : "Không có thay đổi cụ thể";
        String newValue = newValueBuilder.length() > 0 ? newValueBuilder.toString() : "Không có thay đổi cụ thể";

        // Xác định loại amendment - kiểm tra tất cả thay đổi và ưu tiên theo thứ tự
        ContractAmendment.AmendmentType amendmentType = ContractAmendment.AmendmentType.OTHER;
        
        // Kiểm tra từng loại thay đổi
        boolean hasRenterChange = false;
        boolean hasRentChange = false;
        boolean hasDepositChange = false;
        boolean hasEndDateChange = false;
        boolean hasTermsChange = false;
        boolean hasPaymentCycleChange = false;
        
        logger.info("=== START AMENDMENT TYPE DETECTION ===");
        logger.info("Request data - Rent: {}, Deposit: {}, EndDate: {}, PaymentCycle: {}, RenterIds: {}, Terms: {}", 
                   request.getNewRentAmount(), request.getNewDepositAmount(), request.getNewEndDate(), 
                   request.getPaymentCycle(), request.getRenterIds(), request.getNewTerms());
        logger.info("Contract data - Rent: {}, Deposit: {}, EndDate: {}, PaymentCycle: {}", 
                   contract.getRentAmount(), contract.getDepositAmount(), contract.getContractEndDate(), 
                   contract.getPaymentCycle());
        
        // 1. Kiểm tra thay đổi người thuê
        if (request.getRenterIds() != null) {
            java.util.List<Long> currentRenterIds = contract.getRoomUsers().stream()
            .filter(RoomUser::getIsActive)
            .map(ru -> ru.getUser().getId())
            .collect(java.util.stream.Collectors.toList());
            
            java.util.List<Long> newRenterIds = request.getRenterIds() != null ? request.getRenterIds() : new java.util.ArrayList<>();
            
            currentRenterIds.sort(java.util.Comparator.naturalOrder());
            newRenterIds.sort(java.util.Comparator.naturalOrder());
            
            hasRenterChange = !currentRenterIds.equals(newRenterIds);
            logger.info("Renter change check - Current: {}, New: {}, HasChange: {}", currentRenterIds, newRenterIds, hasRenterChange);
        }
        
        // 2. Kiểm tra thay đổi tiền thuê
        if (request.getNewRentAmount() != null) {
            // So sánh chính xác bằng cách chuyển về BigDecimal
            java.math.BigDecimal currentRent = new java.math.BigDecimal(contract.getRentAmount().toString());
            java.math.BigDecimal newRent = new java.math.BigDecimal(request.getNewRentAmount().toString());
            hasRentChange = currentRent.compareTo(newRent) != 0;
            logger.info("Rent change check - Current: {}, New: {}, HasChange: {}", contract.getRentAmount(), request.getNewRentAmount(), hasRentChange);
        } else {
            logger.info("Rent change check - No new rent amount provided");
        }
        
        // 3. Kiểm tra thay đổi tiền cọc
        if (request.getNewDepositAmount() != null) {
            // So sánh chính xác bằng cách chuyển về BigDecimal
            java.math.BigDecimal currentDeposit = new java.math.BigDecimal(contract.getDepositAmount().toString());
            java.math.BigDecimal newDeposit = new java.math.BigDecimal(request.getNewDepositAmount().toString());
            hasDepositChange = currentDeposit.compareTo(newDeposit) != 0;
            logger.info("Deposit change check - Current: {}, New: {}, HasChange: {}", contract.getDepositAmount(), request.getNewDepositAmount(), hasDepositChange);
        } else {
            logger.info("Deposit change check - No new deposit amount provided");
        }
        
        // 4. Kiểm tra thay đổi ngày kết thúc
        if (request.getNewEndDate() != null) {
            hasEndDateChange = !request.getNewEndDate().equals(contract.getContractEndDate());
            logger.info("End date change check - Current: {}, New: {}, HasChange: {}", 
                       contract.getContractEndDate(), request.getNewEndDate(), hasEndDateChange);
        } else {
            logger.info("End date change check - No new end date provided");
        }
        
        // 5. Kiểm tra thay đổi chu kỳ thanh toán
        if (request.getPaymentCycle() != null) {
            hasPaymentCycleChange = !request.getPaymentCycle().equals(contract.getPaymentCycle());
            logger.info("Payment cycle change check - Current: {}, New: {}, HasChange: {}", 
                       contract.getPaymentCycle(), request.getPaymentCycle(), hasPaymentCycleChange);
        } else {
            logger.info("Payment cycle change check - No new payment cycle provided");
        }
        
        // 6. Kiểm tra thay đổi điều khoản
        if (request.getNewTerms() != null) {
            // So sánh điều khoản hiện tại và mới
            java.util.List<String> currentTerms = contract.getTerms() != null ? 
                contract.getTerms().stream()
                    .map(ContractTerm::getContent)
                    .collect(java.util.stream.Collectors.toList()) : 
                new java.util.ArrayList<>();
            
            hasTermsChange = !currentTerms.equals(request.getNewTerms());
            logger.info("Terms change check - Current: {}, New: {}, HasChange: {}", currentTerms, request.getNewTerms(), hasTermsChange);
        }
        
        // Xác định loại amendment theo thứ tự ưu tiên
        if (hasRenterChange) {
            amendmentType = ContractAmendment.AmendmentType.RENTER_CHANGE;
            logger.info("Setting amendment type to RENTER_CHANGE");
        } else if (hasRentChange) {
            amendmentType = ContractAmendment.AmendmentType.RENT_INCREASE;
            logger.info("Setting amendment type to RENT_INCREASE");
        } else if (hasDepositChange) {
            amendmentType = ContractAmendment.AmendmentType.DEPOSIT_CHANGE;
            logger.info("Setting amendment type to DEPOSIT_CHANGE");
        } else if (hasEndDateChange) {
            amendmentType = ContractAmendment.AmendmentType.DURATION_EXTENSION;
            logger.info("Setting amendment type to DURATION_EXTENSION");
        } else if (hasPaymentCycleChange) {
            amendmentType = ContractAmendment.AmendmentType.PAYMENT_CYCLE_CHANGE;
            logger.info("Setting amendment type to PAYMENT_CYCLE_CHANGE");
        } else if (hasTermsChange) {
            amendmentType = ContractAmendment.AmendmentType.TERMS_UPDATE;
            logger.info("Setting amendment type to TERMS_UPDATE");
        }
        
        logger.info("Final amendment type: {} (Renter: {}, Rent: {}, Deposit: {}, EndDate: {}, PaymentCycle: {}, Terms: {})", 
                   amendmentType, hasRenterChange, hasRentChange, hasDepositChange, hasEndDateChange, hasPaymentCycleChange, hasTermsChange);
        logger.info("=== END AMENDMENT TYPE DETECTION ===");

        ContractAmendment amendment = new ContractAmendment();
        amendment.setContract(contract);
        amendment.setAmendmentType(amendmentType);
        amendment.setOldValue(oldValue);
        amendment.setNewValue(newValue);
        amendment.setReason(request.getReasonForUpdate());
        amendment.setEffectiveDate(request.getNewEndDate() != null ? request.getNewEndDate() : Instant.now());
        amendment.setRequiresApproval(request.getRequiresTenantApproval());
        amendment.setPendingApprovals(renterIds);
        amendment.setApprovedBy(new ArrayList<>());
        amendment.setApprovedByLandlord(false);
        amendment.setNewRentAmount(request.getNewRentAmount());
        amendment.setNewDepositAmount(request.getNewDepositAmount());
        amendment.setNewEndDate(request.getNewEndDate());
        amendment.setNewTerms(request.getNewTerms());
        amendment.setNewRenterIds(request.getRenterIds());
        amendment.setNewPaymentCycle(request.getPaymentCycle());
        contractAmendmentRepository.save(amendment);

        sendContractUpdateNotifications(contract, request);
    }

    @Override
    @Transactional
    public void approveAmendment(Long amendmentId, Boolean isLandlordApproval) {
        logger.info("Starting approval process for amendment {}", amendmentId);
        ContractAmendment amendment = contractAmendmentRepository.findById(amendmentId)
            .orElseThrow(() -> new RuntimeException("Không tìm thấy yêu cầu sửa đổi hợp đồng"));
        Long currentUserId = SecurityUtil.getCurrentUserId();
        if (isLandlordApproval != null && isLandlordApproval) {
            amendment.setApprovedByLandlord(true);
        } else {
            // Renter duyệt
            java.util.List<Long> approvedBy = amendment.getApprovedBy();
            if (approvedBy == null) approvedBy = new java.util.ArrayList<>();
            if (!approvedBy.contains(currentUserId)) {
                approvedBy.add(currentUserId);
            }
            amendment.setApprovedBy(approvedBy);
        }
        boolean allRentersApproved = amendment.getPendingApprovals() != null
            && amendment.getApprovedBy() != null
            && amendment.getPendingApprovals().stream().allMatch(id -> amendment.getApprovedBy().contains(id));
        // Duyệt hai phía không phụ thuộc thứ tự: landlord và toàn bộ renter đều có thể duyệt trước/sau
        if (amendment.getApprovedByLandlord() && allRentersApproved) {
            logger.info("Amendment {} approved by all parties. Applying changes to contract.", amendmentId);
            amendment.setStatus(ContractAmendment.AmendmentStatus.APPROVED);
            if (amendment.getAmendmentType() == ContractAmendment.AmendmentType.TERMINATION) {
                terminateContractInternal(amendment.getContract());
            } else {
                applyAmendmentToContract(amendment);
            }
            logger.info("Amendment {} successfully applied to contract.", amendmentId);
        }
        contractAmendmentRepository.save(amendment);
    }

    @Override
    @Transactional
    public void rejectAmendment(Long amendmentId, String reason) {
        ContractAmendment amendment = contractAmendmentRepository.findById(amendmentId)
            .orElseThrow(() -> new RuntimeException("Không tìm thấy yêu cầu sửa đổi hợp đồng"));
        Long currentUserId = SecurityUtil.getCurrentUserId();
        
        // Add user to rejectedBy list
        java.util.List<Long> rejectedBy = amendment.getRejectedBy() != null ? amendment.getRejectedBy() : new java.util.ArrayList<>();
        if (!rejectedBy.contains(currentUserId)) {
            rejectedBy.add(currentUserId);
        }
        amendment.setRejectedBy(rejectedBy);
        
        // Remove user from pendingApprovals list
        java.util.List<Long> pendingApprovals = amendment.getPendingApprovals() != null ? new java.util.ArrayList<>(amendment.getPendingApprovals()) : new java.util.ArrayList<>();
        pendingApprovals.remove(currentUserId);
        amendment.setPendingApprovals(pendingApprovals);
        
        amendment.setReason(reason);

        // Check if amendment should be rejected (if anyone rejected, it's rejected)
        if (rejectedBy.size() > 0) {
            amendment.setStatus(ContractAmendment.AmendmentStatus.REJECTED);
        } else {
            // Check if all required approvals are received
            boolean landlordApproved = amendment.getApprovedByLandlord() != null && amendment.getApprovedByLandlord();
            boolean allRentersApproved = pendingApprovals.isEmpty() && amendment.getApprovedBy() != null && !amendment.getApprovedBy().isEmpty();
            
            if (landlordApproved && allRentersApproved) {
                amendment.setStatus(ContractAmendment.AmendmentStatus.APPROVED);
                if (amendment.getAmendmentType() == ContractAmendment.AmendmentType.TERMINATION) {
                    terminateContract(amendment.getContract().getId());
                } else {
                    applyAmendmentToContract(amendment);
                }
            } else {
                amendment.setStatus(ContractAmendment.AmendmentStatus.PENDING);
            }
        }
        contractAmendmentRepository.save(amendment);
    }
    
    @Override
    public java.util.List<ContractAmendment> getContractAmendments(Long contractId) {
        return contractAmendmentRepository.findByContractIdOrderByCreatedDateDesc(contractId);
    }

    @Override
    public java.util.List<ContractAmendment> getContractAmendmentsByStatus(Long contractId, String status) {
        try {
            ContractAmendment.AmendmentStatus amendmentStatus = ContractAmendment.AmendmentStatus.valueOf(status.toUpperCase());
            return contractAmendmentRepository.findByContractIdAndStatus(contractId, amendmentStatus);
        } catch (IllegalArgumentException e) {
            // Nếu status không hợp lệ, trả về tất cả
            return contractAmendmentRepository.findByContractIdOrderByCreatedDateDesc(contractId);
        }
    }
    
    /**
     * Áp dụng amendment vào hợp đồng
     */
    private void applyAmendmentToContract(ContractAmendment amendment) {
        Contract contract = amendment.getContract();
        
        // Cập nhật hợp đồng hiện tại thay vì tạo mới cho tất cả các loại amendment
        boolean hasChanges = false;
        
        // Cập nhật ngày kết thúc nếu có
            if (amendment.getNewEndDate() != null) {
                contract.setContractEndDate(amendment.getNewEndDate());
            hasChanges = true;
            logger.info("Updated contract {} end date to {}", contract.getId(), amendment.getNewEndDate());
        }
        
        // Cập nhật chu kỳ thanh toán nếu có
        if (amendment.getNewPaymentCycle() != null) {
            contract.setPaymentCycle(amendment.getNewPaymentCycle());
            hasChanges = true;
            logger.info("Updated contract {} payment cycle to {}", contract.getId(), amendment.getNewPaymentCycle());
        }
        
        // Cập nhật tiền đặt cọc nếu có
        if (amendment.getNewDepositAmount() != null) {
            contract.setDepositAmount(java.math.BigDecimal.valueOf(amendment.getNewDepositAmount()));
            hasChanges = true;
            logger.info("Updated contract {} deposit amount to {}", contract.getId(), amendment.getNewDepositAmount());
        }
        
        // Cập nhật tiền thuê nếu có
        if (amendment.getNewRentAmount() != null) {
            contract.setRentAmount(amendment.getNewRentAmount());
            hasChanges = true;
            logger.info("Updated contract {} rent amount to {}", contract.getId(), amendment.getNewRentAmount());
        }
        
        // Cập nhật điều khoản nếu có
        if (amendment.getNewTerms() != null) {
            // Xóa tất cả điều khoản cũ
            if (contract.getTerms() != null) {
                contractTermRepository.deleteAll(contract.getTerms());
                // Clear collection để tránh Hibernate merge các entity đã xóa
                contract.getTerms().clear();
            }
            
            // Thêm điều khoản mới
            for (int i = 0; i < amendment.getNewTerms().size(); i++) {
                String termContent = amendment.getNewTerms().get(i);
                ContractTerm term = new ContractTerm();
                term.setContract(contract);
                term.setContent(termContent);
                term.setTermOrder(i + 1);
                term.setCreatedBy(getCurrentUsername());
                term.setUpdatedBy(getCurrentUsername());
                term.setTermCategory(ContractTerm.TermCategory.GENERAL);
                term.setIsMandatory(false);
                contractTermRepository.save(term);
            }
            hasChanges = true;
            logger.info("Updated contract {} terms, new count: {}", contract.getId(), amendment.getNewTerms().size());
        }
        
        // Đảm bảo hợp đồng vẫn ACTIVE
        contract.setContractStatus(ContractStatus.ACTIVE);
        
        // Lưu thay đổi
        if (hasChanges) {
            contractRepository.save(contract);
            logger.info("Contract {} updated successfully", contract.getId());
        }
        
        // Cập nhật trạng thái phòng nếu cần
        if (contract.getRoom() != null) {
            roomService.updateRoomStatus(contract.getRoom().getId(), RoomStatus.Occupied.name());
        }
        
        // Gửi thông báo thành công
        if (amendment.getAmendmentType() == ContractAmendment.AmendmentType.DURATION_EXTENSION) {
            sendRenewalNotifications(contract);
                } else {
            // Gửi thông báo cập nhật hợp đồng thành công
            sendContractUpdateSuccessNotifications(contract, amendment);
        }
        
        // Xử lý thay đổi người thuê nếu có
        if (amendment.getNewRenterIds() != null) {
            // Logic xử lý thay đổi người thuê (giữ nguyên logic cũ)
            handleRenterChanges(contract, amendment);
        }
    }
    
    /**
     * Xử lý thay đổi người thuê
     */
    private void handleRenterChanges(Contract contract, ContractAmendment amendment) {
        java.util.Set<Long> newRenterIdsSet = new java.util.HashSet<>(amendment.getNewRenterIds());
        java.util.List<ContractRenterInfo> oldRenterInfos = contractRenterInfoRepository.findByContractId(contract.getId());
        
        // Xóa thông tin người thuê cũ
        if (oldRenterInfos != null) {
            contractRenterInfoRepository.deleteAll(oldRenterInfos);
        }
        
        // Thêm thông tin người thuê mới
        for (Long renterId : newRenterIdsSet) {
            User user = userRepository.findById(renterId).orElse(null);
            if (user != null) {
                ContractRenterInfo renterInfo = new ContractRenterInfo();
                renterInfo.setContract(contract);
                renterInfo.setFullName(user.getUserInfo() != null ? user.getUserInfo().getFullName() : user.getUsername());
                renterInfo.setPhoneNumber(user.getUserInfo() != null ? user.getUserInfo().getPhoneNumber() : null);
                renterInfo.setEmail(user.getEmail());
                renterInfo.setNationalID(user.getUserInfo() != null ? user.getUserInfo().getNationalID() : null);
                renterInfo.setPermanentAddress(user.getUserInfo() != null ? user.getUserInfo().getPermanentAddress() : null);
                contractRenterInfoRepository.save(renterInfo);
            }
        }
    }
    
    /**
     * Gửi thông báo cập nhật hợp đồng thành công
     */
    private void sendContractUpdateSuccessNotifications(Contract contract, ContractAmendment amendment) {
        String amendmentTypeText = getAmendmentTypeText(amendment.getAmendmentType());
        
        // Gửi thông báo cho landlord
        if (contract.getRoom() != null && contract.getRoom().getLandlord() != null) {
                    notificationService.createAndSend(new com.mpbhms.backend.dto.NotificationDTO() {{
                setRecipientId(contract.getRoom().getLandlord().getId());
                setTitle("Cập nhật hợp đồng thành công");
                setMessage("Hợp đồng #" + contract.getId() + " đã được cập nhật " + amendmentTypeText.toLowerCase() + " thành công.");
                        setType(com.mpbhms.backend.enums.NotificationType.CUSTOM);
                    }});
                }
                
        // Gửi thông báo cho người thuê
            if (contract.getRoomUsers() != null) {
            for (RoomUser ru : contract.getRoomUsers()) {
                if (ru.getUser() != null && Boolean.TRUE.equals(ru.getIsActive())) {
                    notificationService.createAndSend(new com.mpbhms.backend.dto.NotificationDTO() {{
                        setRecipientId(ru.getUser().getId());
                        setTitle("Cập nhật hợp đồng thành công");
                        setMessage("Hợp đồng #" + contract.getId() + " đã được cập nhật " + amendmentTypeText.toLowerCase() + " thành công.");
                        setType(com.mpbhms.backend.enums.NotificationType.CUSTOM);
                    }});
                }
            }
        }
    }
    
    /**
     * Lấy text cho loại amendment
     */
    private String getAmendmentTypeText(ContractAmendment.AmendmentType type) {
        switch (type) {
            case RENT_INCREASE: return "Tăng tiền thuê";
            case DEPOSIT_CHANGE: return "Thay đổi tiền cọc";
            case TERMS_UPDATE: return "Cập nhật điều khoản";
            case DURATION_EXTENSION: return "Gia hạn hợp đồng";
            case RENTER_CHANGE: return "Thay đổi người thuê";
            case PAYMENT_CYCLE_CHANGE: return "Thay đổi chu kỳ thanh toán";
            case TERMINATION: return "Chấm dứt hợp đồng";
            case OTHER: return "Thay đổi khác";
            default: return type.name();
        }
    }

    // Thêm hàm sinh số hợp đồng mới
    private String generateNewContractNumber() {
        // Đồng bộ với format HD-YYYY-XXXXX
        String year = java.time.LocalDate.now().getYear() + "";
        // Tìm số hợp đồng lớn nhất trong năm hiện tại để tăng dần
        java.util.List<Contract> contractsThisYear = contractRepository.findAll().stream()
            .filter(c -> c.getContractNumber() != null && c.getContractNumber().startsWith("HD-" + year + "-"))
            .toList();
        
        int maxNumber = 0;
        for (Contract contract : contractsThisYear) {
            try {
                String[] parts = contract.getContractNumber().split("-");
                if (parts.length >= 3) {
                    int number = Integer.parseInt(parts[2]);
                    maxNumber = Math.max(maxNumber, number);
                }
            } catch (NumberFormatException ignored) {
                // Bỏ qua nếu không parse được số
            }
        }
        
        return String.format("HD-%s-%05d", year, maxNumber + 1);
    }
    
    /**
     * Gửi thông báo khi có thay đổi hợp đồng
     */
    private void sendContractUpdateNotifications(Contract contract, UpdateContractRequest request) {
        if (contract.getRoomUsers() != null) {
            for (RoomUser roomUser : contract.getRoomUsers()) {
                if (roomUser.getIsActive() && roomUser.getUser() != null) {
                    NotificationDTO notification = new NotificationDTO();
                    notification.setRecipientId(roomUser.getUser().getId());
                    notification.setTitle("Hợp đồng đã được cập nhật");
                    notification.setMessage(String.format(
                        "Hợp đồng phòng %s đã được cập nhật: %s. Vui lòng kiểm tra và phê duyệt.",
                        contract.getRoom().getRoomNumber(),
                        request.getReasonForUpdate()
                    ));
                    notification.setType(com.mpbhms.backend.enums.NotificationType.CUSTOM);
                    
                    try {
                        notificationService.createAndSend(notification);
                    } catch (Exception e) {
                        logger.error("Error sending contract update notification: {}", e.getMessage());
                    }
                }
            }
        }
    }

    @Override
    public java.util.List<com.mpbhms.backend.dto.ContractDTO> getContractsByRenterId(Long renterId) {
        java.util.List<com.mpbhms.backend.entity.RoomUser> roomUsers = roomUserRepository.findByUserIdAndIsActiveTrue(renterId);
        java.util.Set<Long> roomIds = new java.util.HashSet<>();
        for (com.mpbhms.backend.entity.RoomUser ru : roomUsers) {
            if (ru.getRoom() != null) {
                roomIds.add(ru.getRoom().getId());
            }
        }
        java.util.List<com.mpbhms.backend.entity.Contract> contracts = new java.util.ArrayList<>();
        for (Long roomId : roomIds) {
            com.mpbhms.backend.entity.Contract active = contractRepository.findActiveByRoomId(roomId).orElse(null);
            if (active != null) {
                contracts.add(active);
            } else {
                java.util.List<com.mpbhms.backend.entity.Contract> all = contractRepository.findByRoomId(roomId);
                if (!all.isEmpty()) {
                    com.mpbhms.backend.entity.Contract latest = all.stream().max(java.util.Comparator.comparing(com.mpbhms.backend.entity.Contract::getContractEndDate)).orElse(null);
                    if (latest != null) contracts.add(latest);
                }
            }
        }
        return contracts.stream().map(this::toDTO).toList();
    }

    @Override
    @Transactional
    public void terminateContract(Long contractId) {
        Contract contract = contractRepository.findById(contractId)
            .orElseThrow(() -> new RuntimeException("Không tìm thấy hợp đồng"));
        
        // Kiểm tra quyền: chỉ landlord mới có thể chấm dứt hợp đồng trực tiếp
        Long currentUserId = SecurityUtil.getCurrentUserId();
        boolean isLandlord = contract.getRoom().getLandlord().getId().equals(currentUserId);
        
        if (!isLandlord) {
            throw new RuntimeException("Chỉ chủ phòng mới có thể chấm dứt hợp đồng trực tiếp.");
        }
        
        // Thực hiện chấm dứt thực sự
        terminateContractInternal(contract);
    }

    /**
     * Chấm dứt hợp đồng không kiểm tra quyền. Dùng cho các luồng đã được phê duyệt (song phương).
     */
    private void terminateContractInternal(Contract contract) {
        // Lưu lịch sử vào ContractRenterInfo trước khi xóa RoomUser
        if (contract.getRoomUsers() != null) {
            for (RoomUser ru : contract.getRoomUsers()) {
                if (ru.getIsActive() != null && ru.getIsActive()) {
                    // Kiểm tra xem đã có thông tin lịch sử của user này chưa
                    boolean alreadyExists = false;
                    java.util.List<ContractRenterInfo> existingInfos = contractRenterInfoRepository.findByContractId(contract.getId());
                    
                    for (ContractRenterInfo existingInfo : existingInfos) {
                        if (ru.getUser() != null && ru.getUser().getUserInfo() != null) {
                            if (existingInfo.getFullName().equals(ru.getUser().getUserInfo().getFullName()) && 
                                existingInfo.getPhoneNumber().equals(ru.getUser().getUserInfo().getPhoneNumber())) {
                                alreadyExists = true;
                                break;
                            }
                        }
                    }
                    
                    // Chỉ tạo mới nếu chưa có thông tin lịch sử
                    if (!alreadyExists) {
                        ContractRenterInfo history = new ContractRenterInfo();
                        history.setContract(contract);
                        if (ru.getUser() != null && ru.getUser().getUserInfo() != null) {
                            history.setFullName(ru.getUser().getUserInfo().getFullName());
                            history.setPhoneNumber(ru.getUser().getUserInfo().getPhoneNumber());
                            history.setNationalID(ru.getUser().getUserInfo().getNationalID());
                            history.setPermanentAddress(ru.getUser().getUserInfo().getPermanentAddress());
                            history.setEmail(ru.getUser().getEmail());
                        }
                        contractRenterInfoRepository.save(history);
                        logger.info("Created ContractRenterInfo history for user {} in terminated contract {}", 
                            ru.getUser() != null ? ru.getUser().getUserInfo().getFullName() : "Unknown", contract.getId());
                    } else {
                        logger.info("ContractRenterInfo history already exists for user {} in contract {}", 
                            ru.getUser() != null ? ru.getUser().getUserInfo().getFullName() : "Unknown", contract.getId());
                    }
                }
            }
        }
        
        // Cập nhật trạng thái hợp đồng thành TERMINATED
        contract.setContractStatus(ContractStatus.TERMINATED);
        contractRepository.save(contract);
        logger.info("Contract {} terminated successfully", contract.getId());
        
        Room room = contract.getRoom();
        
        // Xóa RoomUser sau khi đã lưu lịch sử
        if (contract.getRoomUsers() != null) {
            for (RoomUser ru : contract.getRoomUsers()) {
                if (ru.getIsActive() != null && ru.getIsActive()) {
                    roomUserRepository.delete(ru); // XÓA HẲN khỏi DB
                    logger.info("Deleted RoomUser {} for user {} in terminated contract {}", 
                        ru.getId(), ru.getUser() != null ? ru.getUser().getUserInfo().getFullName() : "Unknown", contract.getId());
                }
            }
        }
        
        // Kiểm tra xem phòng còn người thuê nào không
        if (room != null) {
            int activeUserCount = roomUserRepository.countByRoomId(room.getId());
            if (activeUserCount == 0) {
                roomService.updateRoomStatus(room.getId(), RoomStatus.Available.name());
                logger.info("Room {} status updated to Available after contract termination", room.getId());
            }
        }
    }

    @Override
    public List<ContractDTO> getContractsByRoomId(Long roomId) {
        List<Contract> contracts = contractRepository.findByRoomId(roomId);
        return contracts.stream().map(this::toDTO).collect(java.util.stream.Collectors.toList());
    }

    @Transactional
    public void requestTerminateContract(Long contractId, String reason) {
        Contract contract = contractRepository.findById(contractId)
            .orElseThrow(() -> new RuntimeException("Không tìm thấy hợp đồng"));
        java.util.List<Long> renterIds = contract.getRoomUsers().stream()
            .filter(RoomUser::getIsActive)
            .map(ru -> ru.getUser().getId())
            .collect(java.util.stream.Collectors.toList());

        ContractAmendment amendment = new ContractAmendment();
        amendment.setContract(contract);
        amendment.setAmendmentType(ContractAmendment.AmendmentType.TERMINATION);
        amendment.setOldValue("Trạng thái: Đang hiệu lực");
        amendment.setNewValue("Trạng thái: Đã chấm dứt");
        amendment.setReason(reason);
        amendment.setRequiresApproval(true);
        amendment.setPendingApprovals(renterIds);
        amendment.setApprovedBy(new java.util.ArrayList<>());
        amendment.setStatus(ContractAmendment.AmendmentStatus.PENDING);
        amendment.setApprovedByLandlord(false);
        contractAmendmentRepository.save(amendment);
    }

    @Override
    public void requestRenewalAmendment(Long contractId, java.time.Instant newEndDate, String reason, Long userId) {
        Contract contract = contractRepository.findById(contractId)
            .orElseThrow(() -> new RuntimeException("Không tìm thấy hợp đồng"));
        
        // Kiểm tra trạng thái hợp đồng
        if (contract.getContractStatus() == com.mpbhms.backend.enums.ContractStatus.TERMINATED) {
            throw new RuntimeException("Hợp đồng đã bị chấm dứt, không thể gia hạn.");
        }
        
        // Kiểm tra quyền: chỉ renter trong hợp đồng hoặc landlord mới có thể yêu cầu gia hạn
        Long currentUserId = SecurityUtil.getCurrentUserId();
        boolean isLandlord = contract.getRoom().getLandlord().getId().equals(currentUserId);
        boolean isRenter = contract.getRoomUsers().stream()
            .anyMatch(ru -> ru.getUser().getId().equals(currentUserId) && ru.getIsActive());
        
        if (!isLandlord && !isRenter) {
            throw new RuntimeException("Chỉ chủ nhà hoặc người thuê mới có thể yêu cầu gia hạn hợp đồng.");
        }
        
        // Kiểm tra thời gian: chỉ có thể yêu cầu gia hạn trong vòng 30 ngày trước khi hết hạn
        java.time.Instant now = java.time.Instant.now();
        java.time.Duration timeToExpiry = java.time.Duration.between(now, contract.getContractEndDate());
        long daysToExpiry = timeToExpiry.toDays();
        
        if (daysToExpiry > 30) {
            throw new RuntimeException("Chỉ có thể yêu cầu gia hạn trong vòng 30 ngày trước khi hợp đồng hết hạn.");
        }
        
        // ✅ VALIDATE: Ngày kết thúc mới phải hợp lệ (sau ngày kết thúc hiện tại)
        if (newEndDate.isBefore(contract.getContractEndDate())) {
            throw new RuntimeException("Ngày kết thúc mới phải sau ngày kết thúc hiện tại của hợp đồng.");
        }
        
        // ✅ VALIDATE: Ngày kết thúc mới phải là tương lai (sau ngày hiện tại)
        if (newEndDate.isBefore(now)) {
            throw new RuntimeException("Ngày kết thúc mới phải là ngày trong tương lai.");
        }
        
        // ✅ VALIDATE: Ngày kết thúc mới phải sau ngày hiện tại ít nhất 1 ngày
        java.time.Instant tomorrow = now.plus(java.time.Duration.ofDays(1));
        if (newEndDate.isBefore(tomorrow)) {
            throw new RuntimeException("Ngày kết thúc mới phải sau ngày hiện tại ít nhất 1 ngày.");
        }
        
        // Kiểm tra ngày kết thúc mới phải đúng chu kỳ thanh toán
        java.time.LocalDate oldEnd = contract.getContractEndDate().atZone(java.time.ZoneId.systemDefault()).toLocalDate();
        java.time.LocalDate newEnd = newEndDate.atZone(java.time.ZoneId.systemDefault()).toLocalDate();
        long monthsBetween = java.time.temporal.ChronoUnit.MONTHS.between(oldEnd, newEnd);
        
        switch (contract.getPaymentCycle()) {
            case MONTHLY:
                if (monthsBetween < 1) {
                    throw new RuntimeException("Thời gian gia hạn phải tối thiểu 1 tháng cho chu kỳ thanh toán hàng tháng.");
                }
                // Cho phép gia hạn bất kỳ số tháng nào >= 1
                break;
            case QUARTERLY:
                if (monthsBetween < 3 || monthsBetween % 3 != 0) {
                    throw new RuntimeException("Thời gian gia hạn phải là bội số của quý (tối thiểu 3 tháng) cho chu kỳ thanh toán theo quý.");
                }
                break;
            case YEARLY:
                if (monthsBetween < 12 || monthsBetween % 12 != 0) {
                    throw new RuntimeException("Thời gian gia hạn phải là bội số của năm (tối thiểu 12 tháng) cho chu kỳ thanh toán hàng năm.");
                }
                break;
        }
        
        // Kiểm tra đã có amendment duration_extension pending chưa
        boolean existsPending = contractAmendmentRepository.findByContractIdAndAmendmentType(contractId, ContractAmendment.AmendmentType.DURATION_EXTENSION)
            .stream().anyMatch(a -> a.getStatus() == ContractAmendment.AmendmentStatus.PENDING);
        if (existsPending) {
            throw new RuntimeException("Đã có yêu cầu gia hạn đang chờ duyệt cho hợp đồng này.");
        }
        
        // Tạo amendment gia hạn
        ContractAmendment amendment = new ContractAmendment();
        amendment.setContract(contract);
        amendment.setAmendmentType(ContractAmendment.AmendmentType.DURATION_EXTENSION);
        amendment.setStatus(ContractAmendment.AmendmentStatus.PENDING);
        amendment.setOldValue("Ngày kết thúc: " + contract.getContractEndDate().atZone(java.time.ZoneId.systemDefault()).toLocalDate().format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy")));
        amendment.setNewValue("Ngày kết thúc: " + newEndDate.atZone(java.time.ZoneId.systemDefault()).toLocalDate().format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy")));
        amendment.setNewEndDate(newEndDate);
        amendment.setReason(reason != null && !reason.trim().isEmpty() ? reason : "Yêu cầu gia hạn hợp đồng");
        amendment.setCreatedBy(currentUserId.toString());
        amendment.setCreatedDate(java.time.Instant.now());
        amendment.setRequiresApproval(true);
        
        // Thiết lập logic duyệt dựa trên người yêu cầu
        if (isLandlord) {
            // Landlord yêu cầu -> cần renter duyệt
            amendment.setApprovedByLandlord(true);
            java.util.List<Long> renterIds = contract.getRoomUsers().stream()
                .filter(RoomUser::getIsActive)
                .map(ru -> ru.getUser().getId())
                .collect(java.util.stream.Collectors.toList());
            amendment.setPendingApprovals(renterIds);
            amendment.setApprovedBy(new java.util.ArrayList<>());
        } else {
            // Renter yêu cầu -> cần landlord duyệt
            amendment.setApprovedByLandlord(false);
            amendment.setPendingApprovals(new java.util.ArrayList<>());
            amendment.setApprovedBy(new java.util.ArrayList<>());
        }
        
        contractAmendmentRepository.save(amendment);
        
        // Gửi thông báo
        sendRenewalRequestNotifications(contract, amendment, isLandlord);
    }

    /**
     * Gửi thông báo khi có yêu cầu gia hạn hợp đồng
     */
    private void sendRenewalRequestNotifications(Contract contract, ContractAmendment amendment, boolean isLandlordRequest) {
        if (isLandlordRequest) {
            // Landlord yêu cầu -> gửi thông báo cho renter
            if (contract.getRoomUsers() != null) {
                for (RoomUser roomUser : contract.getRoomUsers()) {
                    if (roomUser.getIsActive() && roomUser.getUser() != null) {
                        NotificationDTO notification = new NotificationDTO();
                        notification.setRecipientId(roomUser.getUser().getId());
                        notification.setTitle("Yêu cầu gia hạn hợp đồng");
                        notification.setMessage(String.format(
                            "Chủ nhà đã yêu cầu gia hạn hợp đồng phòng %s đến ngày %s. Vui lòng xem xét và phê duyệt.",
                            contract.getRoom().getRoomNumber(),
                            java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy")
                                .format(amendment.getNewEndDate().atZone(java.time.ZoneId.systemDefault()))
                        ));
                        notification.setType(com.mpbhms.backend.enums.NotificationType.CUSTOM);
                        
                        try {
                            notificationService.createAndSend(notification);
                        } catch (Exception e) {
                            logger.error("Error sending renewal request notification to renter: {}", e.getMessage());
                        }
                    }
                }
            }
        } else {
            // Renter yêu cầu -> gửi thông báo cho landlord
            if (contract.getRoom() != null && contract.getRoom().getLandlord() != null) {
                NotificationDTO notification = new NotificationDTO();
                notification.setRecipientId(contract.getRoom().getLandlord().getId());
                notification.setTitle("Yêu cầu gia hạn hợp đồng");
                notification.setMessage(String.format(
                    "Người thuê đã yêu cầu gia hạn hợp đồng phòng %s đến ngày %s. Vui lòng xem xét và phê duyệt.",
                    contract.getRoom().getRoomNumber(),
                    java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy")
                        .format(amendment.getNewEndDate().atZone(java.time.ZoneId.systemDefault()))
                ));
                notification.setType(com.mpbhms.backend.enums.NotificationType.CUSTOM);
                
                try {
                    notificationService.createAndSend(notification);
                } catch (Exception e) {
                    logger.error("Error sending renewal request notification to landlord: {}", e.getMessage());
                }
            }
        }
    }

    /**
     * Scheduled task: Tự động duyệt hợp đồng PENDING nếu quá thời gian chờ duyệt
     */
    @Scheduled(cron = "0 0/5 * * * ?") // Chạy mỗi 5 phút
    public void autoApprovePendingContracts() {
        java.time.Instant now = java.time.Instant.now(); // UTC
        java.util.List<Contract> pendingContracts = contractRepository.findAll().stream()
            .filter(c -> c.getContractStatus() == com.mpbhms.backend.enums.ContractStatus.PENDING)
            .toList();
        for (Contract contract : pendingContracts) {
            if (contract.getCreatedDate() != null) {
                Instant created = contract.getCreatedDate();
                Instant deadline = created.plusSeconds(contractPendingExpireDays * 24 * 60 * 60L);
                logger.info("[AutoApprove] Contract #{} created at {} (epoch {}), deadline at {} (epoch {}), now {} (epoch {})",
                    contract.getId(),
                    created, created.getEpochSecond(),
                    deadline, deadline.getEpochSecond(),
                    now, now.getEpochSecond()
                );
                if (now.isAfter(deadline)) {
                    contract.setContractStatus(com.mpbhms.backend.enums.ContractStatus.ACTIVE);
                    contractRepository.save(contract);
                    // Gửi notification cho các bên
                    if (contract.getRoomUsers() != null) {
                        for (var ru : contract.getRoomUsers()) {
                            if (ru.getUser() != null) {
                                notificationService.createAndSend(new com.mpbhms.backend.dto.NotificationDTO() {{
                                    setRecipientId(ru.getUser().getId());
                                    setTitle("Hợp đồng đã được tự động duyệt");
                                    setMessage("Hợp đồng #" + contract.getId() + " đã được hệ thống tự động duyệt do quá hạn chờ xác nhận.");
                                    setType(com.mpbhms.backend.enums.NotificationType.CUSTOM);
                                }});
                            }
                        }
                    }
                    if (contract.getRoom() != null && contract.getRoom().getLandlord() != null) {
                        notificationService.createAndSend(new com.mpbhms.backend.dto.NotificationDTO() {{
                            setRecipientId(contract.getRoom().getLandlord().getId());
                            setTitle("Hợp đồng đã được tự động duyệt");
                            setMessage("Hợp đồng #" + contract.getId() + " đã được hệ thống tự động duyệt do quá hạn chờ xác nhận.");
                            setType(com.mpbhms.backend.enums.NotificationType.CUSTOM);
                        }});
                    }
                }
            } else {
                logger.warn("[AutoApprove] Contract #{} has null createdDate!", contract.getId());
            }
        }
    }

    @Scheduled(cron = "0 0/5 * * * ?") // Chạy mỗi 5 phút
    public void autoApprovePendingAmendments() {
        int amendmentPendingExpireDays = 2; // hoặc lấy từ config nếu cần
        Instant now = Instant.now();
        java.util.List<ContractAmendment> pendingAmendments = contractAmendmentRepository.findAll().stream()
            .filter(a -> a.getStatus() == ContractAmendment.AmendmentStatus.PENDING)
            .toList();
        for (ContractAmendment amendment : pendingAmendments) {
            if (amendment.getCreatedDate() != null) {
                Instant created = amendment.getCreatedDate();
                Instant deadline = created.plusSeconds(amendmentPendingExpireDays * 24 * 60 * 60L);
                logger.info("[AutoApproveAmendment] Amendment #{} created at {} (epoch {}), deadline at {} (epoch {}), now {} (epoch {})",
                    amendment.getId(),
                    created, created.getEpochSecond(),
                    deadline, deadline.getEpochSecond(),
                    now, now.getEpochSecond()
                );
                if (now.isAfter(deadline)) {
                    amendment.setStatus(ContractAmendment.AmendmentStatus.APPROVED);
                    contractAmendmentRepository.save(amendment);
                    // Nếu không phải TERMINATION thì áp dụng amendment vào hợp đồng
                    if (amendment.getAmendmentType() != ContractAmendment.AmendmentType.TERMINATION) {
                        try {
                            applyAmendmentToContract(amendment);
                        } catch (Exception e) {
                            logger.error("[AutoApproveAmendment] Lỗi khi áp dụng amendment #{}: {}", amendment.getId(), e.getMessage());
                        }
                        // Gửi notification cho landlord và renter
                        Contract contract = amendment.getContract();
                        String msg = "Yêu cầu thay đổi hợp đồng #" + contract.getId() + " đã được hệ thống tự động duyệt sau quá hạn.";
                        if (contract.getRoomUsers() != null) {
                            for (RoomUser ru : contract.getRoomUsers()) {
                                if (ru.getUser() != null) {
                                    notificationService.createAndSend(new com.mpbhms.backend.dto.NotificationDTO() {{
                                        setRecipientId(ru.getUser().getId());
                                        setTitle("Yêu cầu thay đổi hợp đồng đã được tự động duyệt");
                                        setMessage(msg);
                                        setType(com.mpbhms.backend.enums.NotificationType.CUSTOM);
                                    }});
                                }
                            }
                        }
                        if (contract.getRoom() != null && contract.getRoom().getLandlord() != null) {
                            notificationService.createAndSend(new com.mpbhms.backend.dto.NotificationDTO() {{
                                setRecipientId(contract.getRoom().getLandlord().getId());
                                setTitle("Yêu cầu thay đổi hợp đồng đã được tự động duyệt");
                                setMessage(msg);
                                setType(com.mpbhms.backend.enums.NotificationType.CUSTOM);
                            }});
                        }
                    } else {
                        // Nếu là TERMINATION thì gọi terminateContract
                        try {
                            terminateContract(amendment.getContract().getId());
                        } catch (Exception e) {
                            logger.error("[AutoApproveAmendment] Lỗi khi terminate contract #{}: {}", amendment.getContract().getId(), e.getMessage());
                        }
                        // Gửi notification cho landlord và renter
                        Contract contract = amendment.getContract();
                        String msg = "Yêu cầu chấm dứt hợp đồng #" + contract.getId() + " đã được hệ thống tự động duyệt sau quá hạn.";
                        if (contract.getRoomUsers() != null) {
                            for (RoomUser ru : contract.getRoomUsers()) {
                                if (ru.getUser() != null) {
                                    notificationService.createAndSend(new com.mpbhms.backend.dto.NotificationDTO() {{
                                        setRecipientId(ru.getUser().getId());
                                        setTitle("Yêu cầu chấm dứt hợp đồng đã được tự động duyệt");
                                        setMessage(msg);
                                        setType(com.mpbhms.backend.enums.NotificationType.CUSTOM);
                                    }});
                                }
                            }
                        }
                        if (contract.getRoom() != null && contract.getRoom().getLandlord() != null) {
                            notificationService.createAndSend(new com.mpbhms.backend.dto.NotificationDTO() {{
                                setRecipientId(contract.getRoom().getLandlord().getId());
                                setTitle("Yêu cầu chấm dứt hợp đồng đã được tự động duyệt");
                                setMessage(msg);
                                setType(com.mpbhms.backend.enums.NotificationType.CUSTOM);
                            }});
                        }
                    }
                }
            } else {
                logger.warn("[AutoApproveAmendment] Amendment #{} has null createdDate!", amendment.getId());
            }
        }
    }

    /**
     * Đảm bảo ContractRenterInfo tồn tại cho hợp đồng
     */
    private void ensureContractRenterInfoExists(Contract contract) {
        java.util.List<ContractRenterInfo> existingInfos = contractRenterInfoRepository.findByContractId(contract.getId());
        
        if (existingInfos == null || existingInfos.isEmpty()) {
            logger.warn("Tạo ContractRenterInfo cho hợp đồng {} vì không tìm thấy", contract.getId());
            
            if (contract.getRoomUsers() != null && !contract.getRoomUsers().isEmpty()) {
                for (RoomUser roomUser : contract.getRoomUsers()) {
                    if (roomUser.getUser() != null && roomUser.getUser().getUserInfo() != null) {
                        ContractRenterInfo info = new ContractRenterInfo();
                        info.setContract(contract);
                        info.setFullName(roomUser.getUser().getUserInfo().getFullName());
                        info.setPhoneNumber(roomUser.getUser().getUserInfo().getPhoneNumber());
                        info.setNationalID(roomUser.getUser().getUserInfo().getNationalID());
                        info.setPermanentAddress(roomUser.getUser().getUserInfo().getPermanentAddress());
                        info.setEmail(roomUser.getUser().getEmail()); // Thêm email
                        contractRenterInfoRepository.save(info);
                        logger.info("Đã tạo ContractRenterInfo cho user {} trong hợp đồng {}", 
                            roomUser.getUser().getId(), contract.getId());
                    }
                }
            }
        }
        
        // Tương tự cho ContractLandlordInfo
        java.util.List<com.mpbhms.backend.entity.ContractLandlordInfo> existingLandlordInfos = 
            contractLandlordInfoRepository.findByContractId(contract.getId());
            
        if (existingLandlordInfos == null || existingLandlordInfos.isEmpty()) {
            logger.warn("Tạo ContractLandlordInfo cho hợp đồng {} vì không tìm thấy", contract.getId());
            
            if (contract.getRoom() != null && contract.getRoom().getLandlord() != null && 
                contract.getRoom().getLandlord().getUserInfo() != null) {
                
                com.mpbhms.backend.entity.ContractLandlordInfo landlordInfo = 
                    new com.mpbhms.backend.entity.ContractLandlordInfo();
                landlordInfo.setContract(contract);
                landlordInfo.setFullName(contract.getRoom().getLandlord().getUserInfo().getFullName());
                landlordInfo.setPhoneNumber(contract.getRoom().getLandlord().getUserInfo().getPhoneNumber());
                landlordInfo.setNationalID(contract.getRoom().getLandlord().getUserInfo().getNationalID());
                landlordInfo.setPermanentAddress(contract.getRoom().getLandlord().getUserInfo().getPermanentAddress());
                contractLandlordInfoRepository.save(landlordInfo);
                logger.info("Đã tạo ContractLandlordInfo cho hợp đồng {}", contract.getId());
            }
        }
    }
    
    // Method để migrate dữ liệu cho các hợp đồng cũ
    @Override
    @Transactional
    public void migrateContractRenterInfo() {
        logger.info("Bắt đầu migrate ContractRenterInfo cho tất cả hợp đồng...");
        
        java.util.List<Contract> allContracts = contractRepository.findAll();
        int migratedCount = 0;
        
        for (Contract contract : allContracts) {
            try {
                ensureContractRenterInfoExists(contract);
                migratedCount++;
            } catch (Exception e) {
                logger.error("Lỗi khi migrate ContractRenterInfo cho hợp đồng {}: {}", contract.getId(), e.getMessage());
            }
        }
        
        logger.info("Hoàn thành migrate ContractRenterInfo cho {} hợp đồng", migratedCount);
    }

}

