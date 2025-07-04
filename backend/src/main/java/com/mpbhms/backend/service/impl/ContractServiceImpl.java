package com.mpbhms.backend.service.impl;

import com.lowagie.text.*;
import com.lowagie.text.pdf.BaseFont;
import com.lowagie.text.pdf.PdfWriter;
import com.mpbhms.backend.entity.Contract;
import com.mpbhms.backend.entity.Room;
import com.mpbhms.backend.entity.RoomUser;
import com.mpbhms.backend.entity.User;
import com.mpbhms.backend.entity.ContractRenterInfo;
import com.mpbhms.backend.repository.ContractRepository;
import com.mpbhms.backend.repository.RoomUserRepository;
import com.mpbhms.backend.service.ContractService;
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
import com.mpbhms.backend.dto.NotificationDTO;
import com.mpbhms.backend.enums.NotificationType;
import com.mpbhms.backend.entity.ContractAmendment;
import com.mpbhms.backend.repository.ContractAmendmentRepository;
import com.mpbhms.backend.dto.UpdateContractRequest;
import com.mpbhms.backend.enums.ContractStatus;
import com.mpbhms.backend.entity.ContractTerm;
import com.mpbhms.backend.repository.ContractTermRepository;
import com.mpbhms.backend.repository.ContractLandlordInfoRepository;

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
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.stream.Collectors;
import java.util.ArrayList;

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
    private static final Logger logger = LoggerFactory.getLogger(ContractServiceImpl.class);

    @Override
    @Transactional
    public byte[] generateContractPdf(Long contractId) {
        Contract contract = contractRepository.findById(contractId)
                .orElseThrow(() -> new RuntimeException("Cannot found Contract with id: " + contractId));
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
            throw new RuntimeException("Không tìm thấy thông tin người thuê snapshot cho hợp đồng này. Vui lòng kiểm tra lại dữ liệu!");
        }

        if (room == null) {
            throw new RuntimeException("Cannot found room in contract with id: " + contractId);
        }

        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        Document document = new Document(PageSize.A4, 50, 50, 50, 50);

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
            Font titleFont = new Font(baseFont, 18, Font.BOLD);
            Font normalFont = new Font(baseFont, 12);
            Font smallBold = new Font(baseFont, 12, Font.BOLD);

            PdfWriter.getInstance(document, outputStream);
            document.open();

            // Format
            DateTimeFormatter dateFormatter = DateTimeFormatter.ofPattern("dd/MM/yyyy").withZone(ZoneId.systemDefault());
            DateTimeFormatter dateTimeFormatter = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
            NumberFormat currencyFormat = NumberFormat.getCurrencyInstance(new Locale("vi", "VN"));

            // Lấy thông tin renter (nhiều người)
            StringBuilder renterInfo = new StringBuilder();
            if (renters != null && !renters.isEmpty()) {
                for (int i = 0; i < renters.size(); i++) {
                    ContractRenterInfo info = renters.get(i);
                    renterInfo.append(String.format(
                        "- Họ tên: %s\n- Số điện thoại: %s\n- Số CCCD: %s\n- Địa chỉ thường trú: %s\n",
                        info.getFullName(),
                        info.getPhoneNumber(),
                        info.getNationalID(),
                        info.getPermanentAddress()
                    ));
                    if (i < renters.size() - 1) {
                        renterInfo.append("\n");
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

            // Quốc hiệu
            Paragraph header = new Paragraph("SOCIALIST REPUBLIC OF VIETNAM", smallBold);
            header.setAlignment(Element.ALIGN_CENTER);
            document.add(header);

            Paragraph slogan = new Paragraph("Independence - Freedom - Happiness", smallBold);
            slogan.setAlignment(Element.ALIGN_CENTER);
            slogan.setSpacingAfter(10f);
            document.add(slogan);

            Paragraph separator = new Paragraph("--- o0o ---", normalFont);
            separator.setAlignment(Element.ALIGN_CENTER);
            separator.setSpacingAfter(10f);
            document.add(separator);

            Paragraph contractTitle = new Paragraph("RENTAL CONTRACT", titleFont);
            contractTitle.setAlignment(Element.ALIGN_CENTER);
            contractTitle.setSpacingAfter(20f);
            document.add(contractTitle);

            // Thêm số hợp đồng vào đầu file PDF
            Paragraph contractNum = new Paragraph("Contract No.: " + (contract.getContractNumber() != null ? contract.getContractNumber() : contract.getId()), smallBold);
            contractNum.setAlignment(Element.ALIGN_RIGHT);
            contractNum.setSpacingAfter(10f);
            document.add(contractNum);

            // Mở đầu
            Paragraph intro = new Paragraph(String.format(
                    "Today, %s, at room number %s, we include:",
                    dateTimeFormatter.format(LocalDateTime.now()), roomNumber), normalFont);
            intro.setSpacingAfter(10f);
            document.add(intro);

            // BÊN A
            Paragraph benA = new Paragraph(String.format(
                    "LANDLORD (PARTY A):" +
                    "\n- Landlord: %s" +
                    "\n- Phone: %s" +
                    "\n- National ID: %s" +
                    "\n- Permanent address: %s",
                    landlordName, landlordPhone, landlordCCCD, landlordAddress), normalFont);
            benA.setSpacingAfter(10f);
            document.add(benA);

            // BÊN B
            Paragraph benB = new Paragraph(String.format(
                "TENANT (PARTY B):\n%s", renterInfo.toString()
            ), normalFont);
            benB.setSpacingAfter(10f);
            document.add(benB);

            // Điều khoản (KHÔNG lặp lại renters)
            Paragraph content = new Paragraph(String.format("""
The two parties agree to sign the rental contract with the following terms:

1. Room information:
   - Room number: %s
   - Rent: %s / month
   - Deposit: %s
   - Rental period: from %s to %s
   - Payment cycle: %s

2. Usage regulations:
   - Party B commits to use the room for the right purpose, maintain hygiene and security.
   - Any damage caused by Party B must be compensated as agreed.

3. Termination of contract:
   - Both parties must notify at least 15 days in advance if they wish to terminate the contract.

This contract is made in 02 copies, each party keeps 01 copy with the same legal value.
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

            // Nếu có điều khoản thì chèn vào đây
            if (contract.getTerms() != null && !contract.getTerms().isEmpty()) {
                Paragraph termsTitle = new Paragraph("CONTRACT TERMS", smallBold);
                termsTitle.setSpacingBefore(10f);
                termsTitle.setSpacingAfter(8f);
                termsTitle.setAlignment(Element.ALIGN_LEFT);
                document.add(termsTitle);

                int idx = 1;
                for (ContractTerm term : contract.getTerms()) {
                    Paragraph termPara = new Paragraph(idx + ". " + term.getContent(), normalFont);
                    termPara.setFirstLineIndent(20f);
                    termPara.setSpacingAfter(4f);
                    termPara.setAlignment(Element.ALIGN_JUSTIFIED);
                    document.add(termPara);
                    idx++;
                }
            }

            // Chữ ký
            Paragraph sign = new Paragraph("""
            LANDLORD (PARTY A)                TENANT (PARTY B)
            (Sign and write full name)        (Sign and write full name)
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

    @Override
    public ResultPaginationDTO getAllContracts(Specification spec, Pageable pageable) {
        try {
            // Debug logging
            logger.info("ContractServiceImpl.getAllContracts - spec: {}", spec);
            logger.info("ContractServiceImpl.getAllContracts - pageable: {}", pageable);
            
            // Xử lý trường hợp spec null
            if (spec == null) {
                logger.info("ContractServiceImpl.getAllContracts - spec is null, using conjunction");
                spec = (root, query, cb) -> cb.conjunction();
            }
            
            Page<Contract> page = contractRepository.findAll(spec, pageable);
            ResultPaginationDTO result = new ResultPaginationDTO();
            result.setMeta(new com.mpbhms.backend.dto.Meta() {{
                setPage(pageable.getPageNumber());
                setPageSize(pageable.getPageSize());
                setPages(page.getTotalPages());
                setTotal(page.getTotalElements());
            }});
            result.setResult(page.getContent().stream().map(this::toDTO).toList());
            return result;
        } catch (Exception e) {
            logger.error("Error in getAllContracts: ", e);
            throw e;
        }
    }

    @Override
    public ContractDTO updateContract(ContractDTO dto) {
        Contract contract = contractRepository.findById(dto.getId())
                .orElseThrow(() -> new RuntimeException("Contract not found"));
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
        // Xóa các điều khoản cũ
        if (contract.getTerms() != null) {
            for (ContractTerm oldTerm : contract.getTerms()) {
                contractTermRepository.delete(oldTerm);
            }
        }
        // Thêm các điều khoản mới
        if (dto.getTerms() != null && !dto.getTerms().isEmpty()) {
            for (String termContent : dto.getTerms()) {
                ContractTerm term = new ContractTerm();
                term.setContract(contract);
                term.setContent(termContent);
                term.setCreatedAt(java.time.Instant.now());
                contractTermRepository.save(term);
            }
        }
        return toDTO(contract);
    }

    @Override
    public void deleteContract(Long id) {
        Contract contract = contractRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Contract not found"));
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
                throw new RuntimeException("This room already has an ACTIVE contract. Cannot create a new contract.");
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
        // Lưu các điều khoản hợp đồng
        if (dto.getTerms() != null && !dto.getTerms().isEmpty()) {
            for (String termContent : dto.getTerms()) {
                ContractTerm term = new ContractTerm();
                term.setContract(contract);
                term.setContent(termContent);
                term.setCreatedAt(java.time.Instant.now());
                contractTermRepository.save(term);
            }
        }
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
        if (contract.getRoomUsers() != null) {
            java.util.List<com.mpbhms.backend.dto.RoomUserDTO> roomUserDTOs = new java.util.ArrayList<>();
            for (com.mpbhms.backend.entity.RoomUser ru : contract.getRoomUsers()) {
                com.mpbhms.backend.dto.RoomUserDTO rudto = new com.mpbhms.backend.dto.RoomUserDTO();
                if (ru.getUser() != null) {
                    rudto.setUserId(ru.getUser().getId());
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
                room.setRoomStatus(com.mpbhms.backend.enums.RoomStatus.Available);
                // Lưu room ở đây nếu cần
                
                // Gửi thông báo cho người thuê
                sendExpirationNotifications(contract);
                
                logger.info("Processed expired contract: {}", contract.getId());
            } catch (Exception e) {
                logger.error("Error processing expired contract {}: {}", contract.getId(), e.getMessage());
            }
        }
    }
    
    @Override
    @Transactional
    public void renewContract(Long contractId, java.time.Instant newEndDate) {
        Contract contract = contractRepository.findById(contractId)
            .orElseThrow(() -> new RuntimeException("Contract not found"));
        
        if (contract.getContractStatus() != com.mpbhms.backend.enums.ContractStatus.EXPIRED) {
            throw new RuntimeException("Only expired contracts can be renewed");
        }
        
        // Gia hạn hợp đồng
        contract.setContractEndDate(newEndDate);
        contract.setContractStatus(com.mpbhms.backend.enums.ContractStatus.ACTIVE);
        contractRepository.save(contract);
        
        // Cập nhật trạng thái phòng
        Room room = contract.getRoom();
        room.setRoomStatus(com.mpbhms.backend.enums.RoomStatus.Occupied);
        // Lưu room ở đây nếu cần
        
        // Gửi thông báo gia hạn
        sendRenewalNotifications(contract);
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
                    notification.setTitle("Contract has expired");
                    notification.setMessage(String.format(
                        "Contract for room %s has expired on %s. Please contact the landlord to renew.",
                        contract.getRoom().getRoomNumber(),
                        java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy")
                            .format(contract.getContractEndDate().atZone(java.time.ZoneId.systemDefault()))
                    ));
                    notification.setType(com.mpbhms.backend.enums.NotificationType.CONTRACT_EXPIRED);
                    
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
                    notification.setTitle("Contract has been renewed");
                    notification.setMessage(String.format(
                        "Contract for room %s has been renewed until %s.",
                        contract.getRoom().getRoomNumber(),
                        java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy")
                            .format(contract.getContractEndDate().atZone(java.time.ZoneId.systemDefault()))
                    ));
                    notification.setType(com.mpbhms.backend.enums.NotificationType.CONTRACT_RENEWED);
                    
                    try {
                        notificationService.createAndSend(notification);
                    } catch (Exception e) {
                        logger.error("Error sending renewal notification: {}", e.getMessage());
                    }
                }
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
            .orElseThrow(() -> new RuntimeException("Contract not found"));
        Long currentUserId = SecurityUtil.getCurrentUserId();
        if (!contract.getRoom().getLandlord().getId().equals(currentUserId)) {
            throw new RuntimeException("Only landlord can update contract");
        }
        java.util.List<Long> renterIds = contract.getRoomUsers().stream()
            .filter(RoomUser::getIsActive)
            .map(ru -> ru.getUser().getId())
            .collect(java.util.stream.Collectors.toList());

        // Tạo 1 amendment tổng hợp
        ContractAmendment amendment = new ContractAmendment();
        amendment.setContract(contract);
        amendment.setAmendmentType(ContractAmendment.AmendmentType.OTHER); // hoặc loại phù hợp
        amendment.setOldValue("multi");
        amendment.setNewValue("multi");
        amendment.setReason(request.getReasonForUpdate());
        amendment.setEffectiveDate(request.getNewEndDate() != null ? request.getNewEndDate() : Instant.now());
        amendment.setRequiresApproval(request.getRequiresTenantApproval());
        amendment.setPendingApprovals(renterIds);
        amendment.setApprovedBy(new ArrayList<>());
        amendment.setNewRentAmount(request.getNewRentAmount());
        amendment.setNewDepositAmount(request.getNewDepositAmount());
        amendment.setNewEndDate(request.getNewEndDate());
        amendment.setNewTerms(request.getNewTerms());
        amendment.setNewRenterIds(request.getRenterIds());
        contractAmendmentRepository.save(amendment);

        sendContractUpdateNotifications(contract, request);
    }

    @Override
    @Transactional
    public void approveAmendment(Long amendmentId, Boolean isLandlordApproval) {
        ContractAmendment amendment = contractAmendmentRepository.findById(amendmentId)
            .orElseThrow(() -> new RuntimeException("Amendment not found"));
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
        if (amendment.getApprovedByLandlord() && allRentersApproved) {
            amendment.setStatus(ContractAmendment.AmendmentStatus.APPROVED);
            if (amendment.getAmendmentType() == ContractAmendment.AmendmentType.TERMINATION) {
                terminateContract(amendment.getContract().getId());
            } else {
                applyAmendmentToContract(amendment);
            }
        }
        contractAmendmentRepository.save(amendment);
    }

    @Override
    @Transactional
    public void rejectAmendment(Long amendmentId, String reason) {
        ContractAmendment amendment = contractAmendmentRepository.findById(amendmentId)
            .orElseThrow(() -> new RuntimeException("Amendment not found"));
        
        amendment.setStatus(ContractAmendment.AmendmentStatus.REJECTED);
        amendment.setReason(reason);
        contractAmendmentRepository.save(amendment);
    }
    
    @Override
    public java.util.List<ContractAmendment> getContractAmendments(Long contractId) {
        return contractAmendmentRepository.findByContractIdOrderByCreatedDateDesc(contractId);
    }
    
    /**
     * Áp dụng amendment vào hợp đồng
     */
    private void applyAmendmentToContract(ContractAmendment amendment) {
        Contract oldContract = amendment.getContract();
        // Check if the room already has an ACTIVE contract (excluding the old contract about to expire)
        if (oldContract.getRoom() != null) {
            java.util.List<Contract> activeContracts = contractRepository.findByRoomIdAndContractStatus(oldContract.getRoom().getId(), com.mpbhms.backend.enums.ContractStatus.ACTIVE);
            // If there is another ACTIVE contract (not the old one), do not allow creating a new one
            if (!activeContracts.isEmpty() && activeContracts.stream().anyMatch(c -> !c.getId().equals(oldContract.getId()))) {
                throw new RuntimeException("This room already has an ACTIVE contract. Cannot create a new contract.");
            }
        }
        oldContract.setContractStatus(ContractStatus.EXPIRED);
        contractRepository.save(oldContract);

        Contract newContract = new Contract();
        newContract.setRoom(oldContract.getRoom());
        newContract.setContractStartDate(Instant.now());
        newContract.setContractStatus(ContractStatus.ACTIVE);
        newContract.setPaymentCycle(oldContract.getPaymentCycle());
        newContract.setDepositAmount(
            amendment.getNewDepositAmount() != null ? amendment.getNewDepositAmount() : oldContract.getDepositAmount()
        );
        newContract.setRentAmount(
            amendment.getNewRentAmount() != null ? amendment.getNewRentAmount() : oldContract.getRentAmount()
        );
        newContract.setContractImage(
            oldContract.getContractImage()
        );
        newContract.setContractNumber(generateNewContractNumber());
        newContract.setContractEndDate(
            amendment.getNewEndDate() != null ? amendment.getNewEndDate() : oldContract.getContractEndDate()
        );
        contractRepository.save(newContract);

        // Thêm điều khoản mới cho hợp đồng mới
        if (amendment.getNewTerms() != null && !amendment.getNewTerms().isEmpty()) {
            for (String termContent : amendment.getNewTerms()) {
                ContractTerm term = new ContractTerm();
                term.setContract(newContract);
                term.setContent(termContent);
                term.setCreatedAt(java.time.Instant.now());
                contractTermRepository.save(term);
            }
        }
        // RoomUser cho hợp đồng mới nếu có newRenterIds
        if (amendment.getNewRenterIds() != null && !amendment.getNewRenterIds().isEmpty()) {
            // Đánh dấu RoomUser cũ là inactive
            if (oldContract.getRoomUsers() != null) {
                for (RoomUser ru : oldContract.getRoomUsers()) {
                    ru.setIsActive(false);
                    roomUserRepository.save(ru);
                }
            }
            // Thêm RoomUser mới cho hợp đồng mới
            for (Long userId : amendment.getNewRenterIds()) {
                User user = userRepository.findById(userId).orElse(null);
                if (user != null) {
                    RoomUser ru = new RoomUser();
                    ru.setRoom(newContract.getRoom());
                    ru.setUser(user);
                    ru.setJoinedAt(Instant.now());
                    ru.setContract(newContract);
                    ru.setIsActive(true);
                    roomUserRepository.save(ru);
                    // Bổ sung: Lưu snapshot thông tin người thuê vào ContractRenterInfo
                    if (user.getUserInfo() != null) {
                        ContractRenterInfo info = new ContractRenterInfo();
                        info.setContract(newContract);
                        info.setFullName(user.getUserInfo().getFullName());
                        info.setPhoneNumber(user.getUserInfo().getPhoneNumber());
                        info.setNationalID(user.getUserInfo().getNationalID());
                        info.setPermanentAddress(user.getUserInfo().getPermanentAddress());
                        contractRenterInfoRepository.save(info);
                    }
                }
            }
        }
        // Lưu snapshot thông tin landlord vào ContractLandlordInfo cho hợp đồng mới
        if (newContract.getRoom() != null && newContract.getRoom().getLandlord() != null && newContract.getRoom().getLandlord().getId() != null) {
            User landlord = userRepository.findById(newContract.getRoom().getLandlord().getId()).orElse(null);
            if (landlord != null && landlord.getUserInfo() != null) {
                com.mpbhms.backend.entity.ContractLandlordInfo landlordInfo = new com.mpbhms.backend.entity.ContractLandlordInfo();
                landlordInfo.setContract(newContract);
                landlordInfo.setFullName(landlord.getUserInfo().getFullName());
                landlordInfo.setPhoneNumber(landlord.getUserInfo().getPhoneNumber());
                landlordInfo.setNationalID(landlord.getUserInfo().getNationalID());
                landlordInfo.setPermanentAddress(landlord.getUserInfo().getPermanentAddress());
                contractLandlordInfoRepository.save(landlordInfo);
            }
        }
    }

    // Thêm hàm sinh số hợp đồng mới
    private String generateNewContractNumber() {
        // Ví dụ: CTR-2024-xxx (tăng tự động hoặc random)
        return "CTR-" + java.time.Year.now() + "-" + System.currentTimeMillis();
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
                    notification.setTitle("Contract has been updated");
                    notification.setMessage(String.format(
                        "Contract for room %s has been updated: %s. Please review and approve.",
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
        java.util.Set<com.mpbhms.backend.entity.Contract> contracts = new java.util.HashSet<>();
        for (com.mpbhms.backend.entity.RoomUser ru : roomUsers) {
            if (ru.getContract() != null) {
                contracts.add(ru.getContract());
            }
        }
        return contracts.stream().map(this::toDTO).toList();
    }

    @Override
    @Transactional
    public void terminateContract(Long contractId) {
        Contract contract = contractRepository.findById(contractId)
            .orElseThrow(() -> new RuntimeException("Contract not found"));
        contract.setContractStatus(ContractStatus.TERMINATED);
        contractRepository.save(contract);
        if (contract.getRoomUsers() != null) {
            for (RoomUser ru : contract.getRoomUsers()) {
                if (ru.getIsActive() != null && ru.getIsActive()) {
                    // Lưu lịch sử vào ContractRenterInfo
                    ContractRenterInfo history = new ContractRenterInfo();
                    history.setContract(contract);
                    if (ru.getUser() != null && ru.getUser().getUserInfo() != null) {
                        history.setFullName(ru.getUser().getUserInfo().getFullName());
                        history.setPhoneNumber(ru.getUser().getUserInfo().getPhoneNumber());
                        history.setNationalID(ru.getUser().getUserInfo().getNationalID());
                        history.setPermanentAddress(ru.getUser().getUserInfo().getPermanentAddress());
                    }
                    contractRenterInfoRepository.save(history);
                    ru.setIsActive(false);
                    roomUserRepository.save(ru);
                }
            }
        }
    }

    @Override
    public java.util.List<ContractDTO> getContractsByRoomId(Long roomId) {
        java.util.List<Contract> contracts = contractRepository.findByRoomId(roomId);
        return contracts.stream().map(this::toDTO).toList();
    }

    @Transactional
    public void requestTerminateContract(Long contractId, String reason) {
        Contract contract = contractRepository.findById(contractId)
            .orElseThrow(() -> new RuntimeException("Contract not found"));
        java.util.List<Long> renterIds = contract.getRoomUsers().stream()
            .filter(RoomUser::getIsActive)
            .map(ru -> ru.getUser().getId())
            .collect(java.util.stream.Collectors.toList());

        ContractAmendment amendment = new ContractAmendment();
        amendment.setContract(contract);
        amendment.setAmendmentType(ContractAmendment.AmendmentType.TERMINATION);
        amendment.setOldValue("ACTIVE");
        amendment.setNewValue("TERMINATED");
        amendment.setReason(reason);
        amendment.setRequiresApproval(true);
        amendment.setPendingApprovals(renterIds);
        amendment.setApprovedBy(new java.util.ArrayList<>());
        amendment.setStatus(ContractAmendment.AmendmentStatus.PENDING);
        amendment.setApprovedByLandlord(false);
        contractAmendmentRepository.save(amendment);
    }
}

