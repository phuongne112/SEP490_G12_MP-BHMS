package com.mpbhms.backend.service.impl;

import com.mpbhms.backend.dto.BillDetailResponse;
import com.mpbhms.backend.dto.BillResponse;
import com.mpbhms.backend.dto.PartialPaymentRequest;
import com.mpbhms.backend.dto.PartialPaymentResponse;
import com.mpbhms.backend.entity.*;
import com.mpbhms.backend.entity.EmailSentLog;
import com.mpbhms.backend.enums.BillItemType;
import com.mpbhms.backend.enums.BillType;
import com.mpbhms.backend.enums.ContractStatus;
import com.mpbhms.backend.enums.PaymentCycle;
import com.mpbhms.backend.enums.ServiceType;
import com.mpbhms.backend.exception.BusinessException;
import com.mpbhms.backend.exception.NotFoundException;
import com.mpbhms.backend.repository.BillRepository;
import com.mpbhms.backend.repository.BillDetailRepository;
import com.mpbhms.backend.repository.ContractRepository;
import com.mpbhms.backend.repository.EmailSentLogRepository;
import com.mpbhms.backend.repository.ServiceReadingRepository;
import com.mpbhms.backend.repository.ServiceRepository;
import com.mpbhms.backend.repository.RoomRepository;
import com.mpbhms.backend.service.BillService;
import com.mpbhms.backend.service.ServiceService;
import com.mpbhms.backend.dto.NotificationDTO;
import com.mpbhms.backend.enums.NotificationType;
import com.mpbhms.backend.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.HashSet;
import com.lowagie.text.*;
import com.lowagie.text.pdf.PdfWriter;
import java.io.ByteArrayOutputStream;
import com.lowagie.text.pdf.BaseFont;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.time.format.DateTimeFormatter;
import java.text.NumberFormat;
import java.util.Locale;
import com.lowagie.text.FontFactory;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfWriter;
import com.lowagie.text.pdf.draw.LineSeparator;
import java.awt.Color;
import java.util.stream.Collectors;
import com.mpbhms.backend.service.EmailService;
import com.mpbhms.backend.service.InterestCalculationService;
import com.mpbhms.backend.service.PaymentHistoryService;
import com.mpbhms.backend.repository.PaymentHistoryRepository;
import org.springframework.transaction.annotation.Transactional;
import java.util.Map;
import java.util.HashMap;

@Service
@RequiredArgsConstructor
public class BillServiceImpl implements BillService {

    private final BillRepository billRepository;
    private final BillDetailRepository billDetailRepository;
    private final ContractRepository contractRepository;
    private final EmailSentLogRepository emailSentLogRepository;
    private final ServiceReadingRepository serviceReadingRepository;
    private final ServiceRepository serviceRepository;
    private final ServiceService serviceService;
    private final RoomRepository roomRepository;
    private final NotificationService notificationService;
    private final EmailService emailService;
    private final InterestCalculationService interestCalculationService;
    private final PaymentHistoryService paymentHistoryService;
    private final PaymentHistoryRepository paymentHistoryRepository;
    
    // Cache để theo dõi các hóa đơn đã gửi cảnh báo ngày thứ 7
    private final Set<Long> warningSentBills = new HashSet<>();

    @Override
    public Bill generateFirstBill(Long contractId) {
        Contract contract = contractRepository.findById(contractId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy hợp đồng"));

        Room room = contract.getRoom();
        PaymentCycle cycle = contract.getPaymentCycle();
        LocalDate startDate = contract.getContractStartDate()
                .atZone(ZoneId.systemDefault()).toLocalDate();
        LocalDate fromDate = startDate;
        LocalDate toDate = calculateEndDate(startDate, cycle);

        return generateBillInternal(contract, fromDate, toDate, BillType.CONTRACT_INIT);
    }

    private Bill generateBillInternal(Contract contract, LocalDate fromDate, LocalDate toDate, BillType billType) {
        Room room = contract.getRoom();
        PaymentCycle cycle = contract.getPaymentCycle();

        // Kiểm tra fromDate/toDate hợp lệ với paymentCycle
        int expectedMonths;
        switch (cycle) {
            case MONTHLY:
                expectedMonths = 1;
                break;
            case QUARTERLY:
                expectedMonths = 3;
                break;
            case YEARLY:
                expectedMonths = 12;
                break;
            default:
                throw new IllegalArgumentException("Chu kỳ thanh toán không hợp lệ: " + cycle);
        }
        LocalDate expectedToDate = fromDate.plusMonths(expectedMonths).minusDays(1);
        if (!toDate.equals(expectedToDate)) {
            throw new BusinessException("Ngày bắt đầu/kết thúc hóa đơn không hợp lệ với chu kỳ thanh toán " + cycle + ". Kỳ đúng phải từ " + fromDate + " đến " + expectedToDate);
        }

        List<BillDetail> details = new ArrayList<>();
        BigDecimal totalAmount = BigDecimal.ZERO;

        // 1. Tiền đặt cọc nếu là hóa đơn khởi tạo hợp đồng
        if (billType == BillType.CONTRACT_INIT && contract.getDepositAmount() != null) {
            BillDetail depositDetail = new BillDetail();
            depositDetail.setItemType(BillItemType.DEPOSIT);
            depositDetail.setDescription("Tiền đặt cọc hợp đồng");
            depositDetail.setItemAmount(contract.getDepositAmount());
            depositDetail.setCreatedDate(Instant.now());
            details.add(depositDetail);
            totalAmount = totalAmount.add(contract.getDepositAmount());
        }

        // 2. Tiền thuê phòng
        int months = countMonths(cycle);
        BigDecimal rent = BigDecimal.valueOf(room.getPricePerMonth())
                .multiply(BigDecimal.valueOf(months));
        BillDetail rentDetail = new BillDetail();
        rentDetail.setItemType(BillItemType.ROOM_RENT);
        rentDetail.setDescription("Tiền phòng từ " + fromDate + " đến " + toDate);
        rentDetail.setItemAmount(rent);
        rentDetail.setCreatedDate(Instant.now());
        details.add(rentDetail);
        totalAmount = totalAmount.add(rent);

        // 3. Convert fromDate/toDate sang Instant
        ZoneId vnZone = ZoneId.of("Asia/Ho_Chi_Minh");
        Instant fromInstant = fromDate.atStartOfDay(vnZone).toInstant();
        Instant toInstant = toDate.atTime(23, 59).atZone(vnZone).toInstant();

        // 4. Dịch vụ của phòng (chỉ lấy dịch vụ đang hoạt động trong kỳ này)
        List<CustomService> services = room.getServiceMappings().stream()
            .filter(mapping -> Boolean.TRUE.equals(mapping.getIsActive()) ||
                (mapping.getEndDate() == null || !mapping.getEndDate().isBefore(toDate)))
            .map(RoomServiceMapping::getService)
            .collect(Collectors.toList());
        for (CustomService service : services) {
            if (service.getServiceType() == ServiceType.ELECTRICITY) {
                // Điện: tính theo chỉ số
                List<ServiceReading> readings = serviceReadingRepository.findByRoomAndServiceAndDateRange(
                        room.getId(), service, fromInstant, toInstant);
                BigDecimal totalConsumed = BigDecimal.ZERO;
                for (ServiceReading reading : readings) {
                    if (reading.getNewReading() != null && reading.getOldReading() != null) {
                        BigDecimal consumed = reading.getNewReading().subtract(reading.getOldReading());
                        if (consumed.compareTo(BigDecimal.ZERO) > 0) {
                            totalConsumed = totalConsumed.add(consumed);
                        }
                    }
                }
                if (totalConsumed.compareTo(BigDecimal.ZERO) > 0) {
                    // Lấy giá dịch vụ tại ngày bắt đầu chu kỳ hóa đơn
                    BigDecimal unitPrice = serviceService.getServicePriceAtDate(service.getId(), fromDate);
                    BigDecimal amount = unitPrice.multiply(totalConsumed);
                    BillDetail serviceDetail = new BillDetail();
                    serviceDetail.setItemType(BillItemType.SERVICE);
                    serviceDetail.setDescription("Dịch vụ " + service.getServiceName() + " (" + service.getServiceType() + ") từ " + fromDate + " đến " + toDate);
                    serviceDetail.setService(service);
                    serviceDetail.setUnitPriceAtBill(unitPrice);
                    serviceDetail.setConsumedUnits(totalConsumed);
                    serviceDetail.setItemAmount(amount);
                    serviceDetail.setCreatedDate(Instant.now());
                    details.add(serviceDetail);
                    totalAmount = totalAmount.add(amount);
                }
            } else if (service.getServiceType() == ServiceType.WATER || service.getServiceType() == ServiceType.OTHER) {
                // Nước & dịch vụ khác: tính theo đầu người
                BigDecimal unitPrice = serviceService.getServicePriceAtDate(service.getId(), fromDate);
                
                // Tính số người trong phòng
                int numberOfPeople = 1; // Mặc định 1 người
                try {
                    if (contract.getRoomUsers() != null) {
                        numberOfPeople = (int) contract.getRoomUsers().stream()
                            .filter(ru -> Boolean.TRUE.equals(ru.getIsActive()))
                            .count();
                        if (numberOfPeople == 0) numberOfPeople = 1; // Đảm bảo ít nhất 1 người
                    }
                } catch (Exception e) {
                    // Nếu có lỗi, mặc định 1 người
                    numberOfPeople = 1;
                }
                
                BigDecimal serviceAmount = unitPrice.multiply(BigDecimal.valueOf(numberOfPeople));
                
                BillDetail fixedDetail = new BillDetail();
                fixedDetail.setItemType(BillItemType.SERVICE);
                fixedDetail.setDescription("Dịch vụ " + service.getServiceName() + " (" + numberOfPeople + " người) từ " + fromDate + " đến " + toDate);
                fixedDetail.setService(service);
                fixedDetail.setUnitPriceAtBill(unitPrice);
                fixedDetail.setConsumedUnits(BigDecimal.valueOf(numberOfPeople));
                fixedDetail.setItemAmount(serviceAmount);
                fixedDetail.setCreatedDate(Instant.now());
                details.add(fixedDetail);
                totalAmount = totalAmount.add(serviceAmount);
            }
        }

        // 5. Kiểm tra và cộng số tiền nợ từ hóa đơn trước
        BigDecimal outstandingDebt = getOutstandingDebtFromPreviousBills(contract, fromDate);
        if (outstandingDebt.compareTo(BigDecimal.ZERO) > 0) {
            BillDetail debtDetail = new BillDetail();
            debtDetail.setItemType(BillItemType.SERVICE);
            debtDetail.setDescription("Số tiền nợ từ hóa đơn trước");
            debtDetail.setItemAmount(outstandingDebt);
            debtDetail.setCreatedDate(Instant.now());
            details.add(debtDetail);
            totalAmount = totalAmount.add(outstandingDebt);
        }

        // 6. Tạo Bill
        Bill bill = new Bill();
        bill.setContract(contract);
        bill.setRoom(room);
        bill.setFromDate(fromInstant);
        bill.setToDate(toInstant);
        bill.setPaymentCycle(cycle);
        // Nếu billType là CONTRACT_TOTAL nhưng không có dòng tiền phòng, thì chuyển thành SERVICE
        boolean hasRoomRent = details.stream().anyMatch(d -> d.getItemType() == BillItemType.ROOM_RENT);
        if (billType == BillType.CONTRACT_TOTAL && !hasRoomRent) {
            bill.setBillType(BillType.SERVICE);
        } else {
            bill.setBillType(billType);
        }
        bill.setBillDate(Instant.now());
        bill.setTotalAmount(totalAmount);
        bill.setStatus(false);
        bill.setBillDetails(details);

        for (BillDetail detail : details) {
            detail.setBill(bill);
        }

        billRepository.save(bill);
        sendBillNotificationToAllUsers(bill);
        return bill;
    }

    @Override
    public Bill generateBill(Long contractId, LocalDate fromDate, LocalDate toDate, BillType billType) {
        System.out.println(String.format(
            "\n🏁 YÊU CẦU TẠO HÓA ĐƠN:\n" +
            "ID Hợp đồng: %d\n" +
            "Từ ngày: %s\n" +
            "Đến ngày: %s\n" +
            "Loại hóa đơn: %s\n" +
            "================================",
            contractId, fromDate, toDate, billType
        ));
        
        Contract contract = contractRepository.findById(contractId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy hợp đồng"));
        Room room = contract.getRoom();
        PaymentCycle cycle = contract.getPaymentCycle();

        // Lấy ngày bắt đầu/kết thúc hợp đồng
        LocalDate contractStart = contract.getContractStartDate().atZone(ZoneId.systemDefault()).toLocalDate();
        LocalDate contractEnd = contract.getContractEndDate().atZone(ZoneId.systemDefault()).toLocalDate();
        // Kiểm tra fromDate/toDate phải nằm trong khoảng hợp đồng
        if (fromDate.isBefore(contractStart) || toDate.isAfter(contractEnd)) {
            throw new BusinessException("Ngày hóa đơn phải nằm trong thời hạn hợp đồng: " + contractStart + " đến " + contractEnd);
        }

        // Kiểm tra null
        if (fromDate == null || toDate == null) {
            throw new BusinessException("Vui lòng nhập ngày bắt đầu và ngày kết thúc!");
        }
        if (fromDate.isAfter(toDate)) {
            throw new BusinessException("Ngày bắt đầu phải trước hoặc bằng ngày kết thúc!");
        }
        
        int expectedMonths;
        switch (cycle) {
            case MONTHLY:
                expectedMonths = 1;
                break;
            case QUARTERLY:
                expectedMonths = 3;
                break;
            case YEARLY:
                expectedMonths = 12;
                break;
            default:
                throw new IllegalArgumentException("Chu kỳ thanh toán không hợp lệ: " + cycle);
        }

        // Phân biệt validation giữa chu kỳ chuẩn và tùy chọn
        boolean isCustomPeriod = isCustomDateRange(fromDate, toDate, contractStart, expectedMonths);
        System.out.println("KẾT QUẢ PHÁT HIỆN: isCustomPeriod = " + isCustomPeriod);
        
        if (!isCustomPeriod) {
            // Logic cứng cho chu kỳ chuẩn - giữ nguyên để đảm bảo tính nhất quán
            // Kiểm tra fromDate phải là ngày bắt đầu hợp đồng hoặc là ngày đầu kỳ tiếp theo
            if (!fromDate.equals(contractStart)) {
                // Tính số tháng giữa contractStart và fromDate
                int monthsBetween = (fromDate.getYear() - contractStart.getYear()) * 12 + (fromDate.getMonthValue() - contractStart.getMonthValue());
                int cycleMonths = expectedMonths;
                if (monthsBetween % cycleMonths != 0 || fromDate.isBefore(contractStart)) {
                    throw new BusinessException("Ngày bắt đầu hóa đơn phải là ngày bắt đầu hợp đồng hoặc ngày đầu tiên của một chu kỳ hợp lệ sau ngày bắt đầu hợp đồng. fromDate không hợp lệ: " + fromDate);
                }
            }
            // Kiểm tra fromDate/toDate hợp lệ với paymentCycle
            LocalDate expectedToDate = fromDate.plusMonths(expectedMonths).minusDays(1);
            if (!toDate.equals(expectedToDate)) {
                throw new BusinessException("Chu kỳ hóa đơn không hợp lệ với hợp đồng! Chu kỳ trong hợp đồng là " + cycle + ". Kỳ đúng phải từ " + fromDate + " đến " + expectedToDate);
            }
        } else {
            // Logic linh hoạt cho khoảng ngày tùy chọn
            validateCustomDateRange(fromDate, toDate, cycle);
        }
        // Kiểm tra chu kỳ truyền vào có khớp với hợp đồng không
        if (billType == BillType.CONTRACT_TOTAL && contract.getPaymentCycle() != cycle) {
            throw new BusinessException("Chu kỳ tính hóa đơn không khớp với chu kỳ trong hợp đồng! Chỉ được tạo hóa đơn theo đúng chu kỳ hợp đồng: " + cycle);
        }

        List<BillDetail> details = new ArrayList<>();
        BigDecimal totalAmount = BigDecimal.ZERO;

        // Tính số tháng dựa trên khoảng ngày thực tế thay vì chu kỳ hợp đồng
        int months;
        if (isCustomPeriod) {
            // Với khoảng ngày tùy chọn, tính dựa trên khoảng ngày thực tế
            long daysBetween = ChronoUnit.DAYS.between(fromDate, toDate) + 1;
            months = Math.max(1, (int) Math.round(daysBetween / 30.0)); // Ít nhất 1 tháng
            System.out.println(String.format(
                "TÍNH TIỀN TÙY CHỌN: %s đến %s (%d ngày) -> %d tháng (Giá: %,.0f × %d = %,.0f VND)",
                fromDate, toDate, daysBetween, months, 
                room.getPricePerMonth(), months, room.getPricePerMonth() * months
            ));
        } else {
            // Với chu kỳ chuẩn, dùng logic cũ
            months = countMonths(cycle);
            System.out.println(String.format(
                "TÍNH TIỀN CHUẨN: %s chu kỳ -> %d tháng (Giá: %,.0f × %d = %,.0f VND)", 
                cycle, months, room.getPricePerMonth(), months, room.getPricePerMonth() * months
            ));
        }
        BigDecimal rent = BigDecimal.valueOf(room.getPricePerMonth()).multiply(BigDecimal.valueOf(months));

        if (billType == BillType.CONTRACT_ROOM_RENT) {
            // Chỉ tạo dòng tiền phòng
            BillDetail rentDetail = new BillDetail();
            rentDetail.setItemType(BillItemType.ROOM_RENT);
            rentDetail.setDescription("Tiền phòng từ " + fromDate + " đến " + toDate);
            rentDetail.setItemAmount(rent);
            rentDetail.setCreatedDate(Instant.now());
            details.add(rentDetail);
            totalAmount = totalAmount.add(rent);
        } else if (billType == BillType.CONTRACT_TOTAL) {
            // Tổng hợp: tiền phòng + dịch vụ
            BillDetail rentDetail = new BillDetail();
            rentDetail.setItemType(BillItemType.ROOM_RENT);
            rentDetail.setDescription("Tiền phòng từ " + fromDate + " đến " + toDate);
            rentDetail.setItemAmount(rent);
            rentDetail.setCreatedDate(Instant.now());
            details.add(rentDetail);
            totalAmount = totalAmount.add(rent);

            // Convert fromDate/toDate sang Instant
            ZoneId vnZone = ZoneId.of("Asia/Ho_Chi_Minh");
            Instant fromInstant = fromDate.atStartOfDay(vnZone).toInstant();
            Instant toInstant = toDate.atTime(23, 59).atZone(vnZone).toInstant();

            // Lấy dịch vụ active
            List<CustomService> services = room.getServiceMappings().stream()
                .filter(mapping -> Boolean.TRUE.equals(mapping.getIsActive()) ||
                    (mapping.getEndDate() == null || !mapping.getEndDate().isBefore(toDate)))
                .map(RoomServiceMapping::getService)
                .collect(Collectors.toList());
            for (CustomService service : services) {
                if (service.getServiceType() == ServiceType.ELECTRICITY) {
                    List<ServiceReading> readings = serviceReadingRepository.findByRoomAndServiceAndDateRange(
                            room.getId(), service, fromInstant, toInstant
                    );
                    BigDecimal totalConsumed = BigDecimal.ZERO;
                    for (ServiceReading reading : readings) {
                        if (reading.getNewReading() != null && reading.getOldReading() != null) {
                            BigDecimal consumed = reading.getNewReading().subtract(reading.getOldReading());
                            if (consumed.compareTo(BigDecimal.ZERO) > 0) {
                                totalConsumed = totalConsumed.add(consumed);
                            }
                        }
                    }
                    if (totalConsumed.compareTo(BigDecimal.ZERO) > 0) {
                        BigDecimal unitPrice = serviceService.getServicePriceAtDate(service.getId(), fromDate);
                        BigDecimal amount = unitPrice.multiply(totalConsumed);
                        BillDetail serviceDetail = new BillDetail();
                        serviceDetail.setItemType(BillItemType.SERVICE);
                        serviceDetail.setDescription("Dịch vụ " + service.getServiceName() + " (" + service.getServiceType() + ") từ " + fromDate + " đến " + toDate);
                        serviceDetail.setService(service);
                        serviceDetail.setUnitPriceAtBill(unitPrice);
                        serviceDetail.setConsumedUnits(totalConsumed);
                        serviceDetail.setItemAmount(amount);
                        serviceDetail.setCreatedDate(Instant.now());
                        details.add(serviceDetail);
                        totalAmount = totalAmount.add(amount);
                    }
                } else if (service.getServiceType() == ServiceType.WATER || service.getServiceType() == ServiceType.OTHER) {
                    BigDecimal unitPrice = serviceService.getServicePriceAtDate(service.getId(), fromDate);
                    
                    // Tính số người trong phòng
                    int numberOfPeople = 1; // Mặc định 1 người
                    try {
                        if (contract.getRoomUsers() != null) {
                            numberOfPeople = (int) contract.getRoomUsers().stream()
                                .filter(ru -> Boolean.TRUE.equals(ru.getIsActive()))
                                .count();
                            if (numberOfPeople == 0) numberOfPeople = 1; // Đảm bảo ít nhất 1 người
                        }
                    } catch (Exception e) {
                        // Nếu có lỗi, mặc định 1 người
                        numberOfPeople = 1;
                    }
                    
                    // Tính toán tiền dịch vụ theo đầu người và tỷ lệ thời gian
                    BigDecimal serviceAmount;
                    if (isCustomPeriod) {
                        // Với khoảng ngày tùy chọn: chỉ cần chạm ngày của một tháng thì tính nguyên giá tháng đó
                        // Tính số tháng được phủ bởi khoảng [fromDate, toDate) theo các tháng lịch
                        LocalDate lastIncluded = toDate.minusDays(1);
                        long monthsTouched = ChronoUnit.MONTHS.between(
                            fromDate.withDayOfMonth(1),
                            lastIncluded.withDayOfMonth(1)
                        ) + 1; // luôn tính ít nhất 1 tháng
                        if (monthsTouched < 1) monthsTouched = 1;
                        serviceAmount = unitPrice
                            .multiply(BigDecimal.valueOf(numberOfPeople))
                            .multiply(BigDecimal.valueOf(monthsTouched));
                    } else {
                        // Với chu kỳ chuẩn, tính theo số tháng chu kỳ
                        int cycleMonths = countMonths(cycle);
                        serviceAmount = unitPrice.multiply(BigDecimal.valueOf(numberOfPeople)).multiply(BigDecimal.valueOf(cycleMonths));
                    }
                    
                    BillDetail fixedDetail = new BillDetail();
                    fixedDetail.setItemType(BillItemType.SERVICE);
                    fixedDetail.setDescription("Dịch vụ " + service.getServiceName() + " (" + numberOfPeople + " người) từ " + fromDate + " đến " + toDate);
                    fixedDetail.setService(service);
                    fixedDetail.setUnitPriceAtBill(unitPrice);
                    fixedDetail.setConsumedUnits(BigDecimal.valueOf(numberOfPeople));
                    fixedDetail.setItemAmount(serviceAmount);
                    fixedDetail.setCreatedDate(Instant.now());
                    details.add(fixedDetail);
                    totalAmount = totalAmount.add(serviceAmount);
                }
            }
        } else {
            // Các loại bill khác giữ nguyên logic cũ nếu có
            // ...
        }

        // Tạo Bill
        Bill bill = new Bill();
        bill.setContract(contract);
        bill.setRoom(room);
        bill.setFromDate(fromDate.atStartOfDay(ZoneId.of("Asia/Ho_Chi_Minh")).toInstant());
        bill.setToDate(toDate.atTime(23, 59).atZone(ZoneId.of("Asia/Ho_Chi_Minh")).toInstant());
        
        // 🆕 Tự động set dueDate = toDate + 7 ngày cho hóa đơn bình thường
        Instant dueDate = toDate.atTime(23, 59).atZone(ZoneId.of("Asia/Ho_Chi_Minh")).toInstant()
            .plusSeconds(7 * 24 * 60 * 60); // +7 days
        bill.setDueDate(dueDate);
        
        bill.setPaymentCycle(cycle);
        // Nếu billType là CONTRACT_TOTAL nhưng không có dòng tiền phòng, thì chuyển thành SERVICE
        boolean hasRoomRent = details.stream().anyMatch(d -> d.getItemType() == BillItemType.ROOM_RENT);
        if (billType == BillType.CONTRACT_TOTAL && !hasRoomRent) {
            bill.setBillType(BillType.SERVICE);
        } else {
            bill.setBillType(billType);
        }
        bill.setBillDate(Instant.now());
        bill.setTotalAmount(totalAmount);
        bill.setStatus(false);
        bill.setBillDetails(details);
        for (BillDetail detail : details) {
            detail.setBill(bill);
        }
        billRepository.save(bill);
        sendBillNotificationToAllUsers(bill);
        return bill;
    }

    private int countMonths(PaymentCycle cycle) {
        switch (cycle) {
            case MONTHLY:
                return 1;
            case QUARTERLY:
                return 3;
            case YEARLY:
                return 12;
            default:
                throw new IllegalArgumentException("Chu kỳ thanh toán không hợp lệ: " + cycle);
        }

    }

    private LocalDate calculateEndDate(LocalDate startDate, PaymentCycle cycle) {
        switch (cycle) {
            case MONTHLY:
                return startDate.plusMonths(1).minusDays(1);
            case QUARTERLY:
                return startDate.plusMonths(3).minusDays(1);
            case YEARLY:
                return startDate.plusYears(1).minusDays(1);
            default:
                throw new IllegalArgumentException("Chu kỳ thanh toán không hợp lệ: " + cycle);
        }
    }

    /**
     * Kiểm tra xem khoảng ngày có phải là tùy chọn (không theo chu kỳ chuẩn) không
     */
    private boolean isCustomDateRange(LocalDate fromDate, LocalDate toDate, LocalDate contractStart, int expectedMonths) {
        System.out.println(String.format(
            "=== isCustomDateRange Debug ===\n" +
            "fromDate: %s\n" +
            "toDate: %s\n" +
            "contractStart: %s\n" +
            "expectedMonths: %d",
            fromDate, toDate, contractStart, expectedMonths
        ));
        
        // Nếu fromDate không phải là ngày bắt đầu hợp đồng
        if (!fromDate.equals(contractStart)) {
            System.out.println("fromDate != contractStart, checking months...");
            // Tính số tháng giữa contractStart và fromDate
            int monthsBetween = (fromDate.getYear() - contractStart.getYear()) * 12 + (fromDate.getMonthValue() - contractStart.getMonthValue());
            System.out.println("monthsBetween: " + monthsBetween);
            // Nếu không chia hết cho chu kỳ, xem như là tùy chọn
            if (monthsBetween % expectedMonths != 0) {
                System.out.println("monthsBetween % expectedMonths != 0 -> CUSTOM PERIOD");
                return true;
            }
        }

        // Kiểm tra toDate có khớp với logic chuẩn không
        LocalDate expectedToDate = fromDate.plusMonths(expectedMonths).minusDays(1);
        boolean isCustom = !toDate.equals(expectedToDate);
        System.out.println(String.format(
            "expectedToDate: %s, actual toDate: %s -> isCustom: %s",
            expectedToDate, toDate, isCustom
        ));
        
        return isCustom;
    }

    /**
     * Validation linh hoạt cho khoảng ngày tùy chọn
     */
    private void validateCustomDateRange(LocalDate fromDate, LocalDate toDate, PaymentCycle cycle) {
        // Tính số tháng giữa hai ngày
        long daysBetween = ChronoUnit.DAYS.between(fromDate, toDate) + 1;
        double monthsBetween = daysBetween / 30.0; // Ước tính

        // Lấy số tháng tiêu chuẩn theo chu kỳ
        int expectedMonths;
        String cycleName;
        switch (cycle) {
            case MONTHLY:
                expectedMonths = 1;
                cycleName = "hàng tháng";
                break;
            case QUARTERLY:
                expectedMonths = 3;
                cycleName = "hàng quý";
                break;
            case YEARLY:
                expectedMonths = 12;
                cycleName = "hàng năm";
                break;
            default:
                throw new IllegalArgumentException("Chu kỳ thanh toán không hợp lệ: " + cycle);
        }

        // Kiểm tra độ chênh lệch - cho phép sai số hợp lý
        double diffFromExpected = Math.abs(monthsBetween - expectedMonths);
        
        // Chỉ từ chối nếu sai lệch quá lớn (hơn 75% chu kỳ) để linh hoạt hơn
        if (diffFromExpected > expectedMonths * 0.75) {
            throw new BusinessException(
                String.format("Khoảng ngày tùy chọn không phù hợp với chu kỳ thanh toán %s. " +
                "Dự kiến: %d tháng, thực tế: %.1f tháng. " +
                "Chênh lệch quá lớn (%.1f tháng), vui lòng chọn khoảng ngày phù hợp hơn.",
                cycleName, expectedMonths, monthsBetween, diffFromExpected)
            );
        }
        
        // Cảnh báo log nếu có sai lệch nhỏ nhưng vẫn cho phép
        if (diffFromExpected > 0.2) {
            System.out.println(String.format(
                "Cảnh báo: Khoảng ngày tùy chọn có sai lệch với chu kỳ %s. " +
                "Dự kiến: %d tháng, thực tế: %.1f tháng",
                cycleName, expectedMonths, monthsBetween
            ));
        }
    }

    @Override
    public Page<Bill> getBillsByContractOrRoom(Long contractId, Long roomId, Pageable pageable) {
        if (contractId != null) {
            return billRepository.findByContractId(contractId, pageable);
        }
        if (roomId != null) {
            return billRepository.findByRoomId(roomId, pageable);
        }
        return billRepository.findAll(pageable);
    }

    @Override
    public Bill getBillById(Long billId) {
        return billRepository.findById(billId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy hóa đơn"));
    }

    @Override
    @Transactional
    public BillResponse toResponse(Bill bill) {
        if (bill == null) {
            throw new RuntimeException("Bill object is null");
        }
        
        // Đảm bảo outstandingAmount được tính đúng
        try {
            bill.calculateOutstandingAmount();
        } catch (Exception e) {
            System.err.println("Lỗi khi tính outstandingAmount cho bill #" + bill.getId() + ": " + e.getMessage());
        }
        
        BillResponse response = new BillResponse();
        response.setId(bill.getId());
        
        // Kiểm tra contract
        if (bill.getContract() != null) {
        response.setContractId(bill.getContract().getId());
        } else {
            System.err.println("Contract is null cho bill #" + bill.getId());
            response.setContractId(null);
        }
        
        // Kiểm tra room
        if (bill.getRoom() != null) {
        response.setRoomId(bill.getRoom().getId());
        
        // Fetch room để tránh lazy loading
        try {
            Room room = roomRepository.findById(bill.getRoom().getId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy room"));
            response.setRoomNumber(room.getRoomNumber());
        } catch (Exception e) {
            System.err.println("Lỗi khi fetch room cho bill #" + bill.getId() + ": " + e.getMessage());
                response.setRoomNumber("N/A");
            }
        } else {
            System.err.println("Room is null cho bill #" + bill.getId());
            response.setRoomId(null);
            response.setRoomNumber("N/A");
        }
        
        response.setFromDate(bill.getFromDate());
        response.setToDate(bill.getToDate());
        response.setPaymentCycle(bill.getPaymentCycle());
        response.setBillType(bill.getBillType());
        response.setBillDate(bill.getBillDate());
        response.setDueDate(bill.getDueDate());
        response.setPaidDate(bill.getPaidDate());
        response.setTotalAmount(bill.getTotalAmount());
        response.setStatus(bill.getStatus());
        
        // Thông tin thanh toán từng phần
        response.setPaidAmount(bill.getPaidAmount());
        response.setPartialPaymentFeesCollected(bill.getPartialPaymentFeesCollected());
        response.setOutstandingAmount(bill.getOutstandingAmount());
        response.setIsPartiallyPaid(bill.getIsPartiallyPaid());
        response.setLastPaymentDate(bill.getLastPaymentDate());

        // Thông tin phạt quá hạn
        if (bill.getOriginalBill() != null) {
            response.setOriginalBillId(bill.getOriginalBill().getId());
        }
        response.setPenaltyRate(bill.getPenaltyRate());
        
        // Tính toán số ngày quá hạn cho tất cả hóa đơn
        try {
        if (bill.getOverdueDays() != null) {
            // Nếu đã có giá trị (hóa đơn phạt), sử dụng giá trị đó
            response.setOverdueDays(bill.getOverdueDays());
        } else {
            // Tính toán số ngày quá hạn cho hóa đơn thường
            response.setOverdueDays(calculateOverdueDays(bill));
            }
        } catch (Exception e) {
            System.err.println("Lỗi khi tính overdueDays cho bill #" + bill.getId() + ": " + e.getMessage());
            response.setOverdueDays(0);
        }
        
        // Làm tròn số tiền phạt để tránh lỗi parsing ở frontend
        if (bill.getPenaltyAmount() != null) {
            response.setPenaltyAmount(bill.getPenaltyAmount().setScale(0, BigDecimal.ROUND_DOWN));
        } else {
            response.setPenaltyAmount(null);
        }
        response.setNotes(bill.getNotes());

        List<BillDetailResponse> detailResponses = new ArrayList<>();
        try {
            if (bill.getBillDetails() != null) {
        for (BillDetail detail : bill.getBillDetails()) {
                    if (detail != null) {
            BillDetailResponse d = new BillDetailResponse();
            d.setItemType(detail.getItemType());
            d.setDescription(detail.getDescription());
            d.setUnitPriceAtBill(detail.getUnitPriceAtBill());
            d.setConsumedUnits(detail.getConsumedUnits());
            d.setItemAmount(detail.getItemAmount());
            if (detail.getService() != null) {
                d.setServiceName(detail.getService().getServiceName());
            }
            detailResponses.add(d);
                    }
                }
            }
        } catch (Exception e) {
            System.err.println("Lỗi khi xử lý billDetails cho bill #" + bill.getId() + ": " + e.getMessage());
        }
        response.setDetails(detailResponses);

        // Thêm danh sách thanh toán tiền mặt pending
        try {
            List<PaymentHistory> pendingCashPayments = paymentHistoryRepository.findByBillIdAndPaymentMethodAndStatusOrderByPaymentDateDesc(
                bill.getId(), "CASH", "PENDING");
            List<Map<String, Object>> pendingPaymentsList = new ArrayList<>();
            
            for (PaymentHistory payment : pendingCashPayments) {
                Map<String, Object> paymentMap = new HashMap<>();
                paymentMap.put("id", payment.getId());
                paymentMap.put("paymentNumber", payment.getPaymentNumber());
                paymentMap.put("paymentAmount", payment.getPaymentAmount());
                paymentMap.put("totalAmount", payment.getTotalAmount());
                paymentMap.put("partialPaymentFee", payment.getPartialPaymentFee());
                paymentMap.put("overdueInterest", payment.getOverdueInterest());
                paymentMap.put("paymentDate", payment.getPaymentDate());
                paymentMap.put("notes", payment.getNotes());
                
                // Thêm thông tin hiển thị đã được Việt hóa
                paymentMap.put("paymentMethodDisplay", getPaymentMethodDisplay(payment.getPaymentMethod()));
                paymentMap.put("statusDisplay", getStatusDisplay(payment.getStatus()));
                paymentMap.put("paymentTypeDisplay", getPaymentTypeDisplay(payment.getIsPartialPayment()));
                
                pendingPaymentsList.add(paymentMap);
            }
            
            response.setPendingCashPayments(pendingPaymentsList);
        } catch (Exception e) {
            System.err.println("Lỗi khi lấy danh sách thanh toán tiền mặt pending cho bill #" + bill.getId() + ": " + e.getMessage());
            response.setPendingCashPayments(new ArrayList<>());
        }

        return response;
    }

    @Override
    public List<BillDetailResponse> calculateServiceBill(Long roomId, int month, int year) {
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy phòng"));
        ZoneId vnZone = ZoneId.of("Asia/Ho_Chi_Minh");
        LocalDate monthStart = LocalDate.of(year, month, 1);
        LocalDate monthEnd = monthStart.withDayOfMonth(monthStart.lengthOfMonth());
        Instant fromInstant = monthStart.atStartOfDay(vnZone).toInstant();
        Instant toInstant = monthEnd.atTime(23, 59).atZone(vnZone).toInstant();
        List<BillDetailResponse> result = new ArrayList<>();
        List<CustomService> services = room.getServiceMappings().stream()
            .filter(mapping -> Boolean.TRUE.equals(mapping.getIsActive()) ||
                (mapping.getEndDate() == null || !mapping.getEndDate().isBefore(monthEnd)))
            .map(RoomServiceMapping::getService)
            .collect(Collectors.toList());
        for (CustomService service : services) {
            if (service.getServiceType() == ServiceType.ELECTRICITY) {
                List<ServiceReading> readings = serviceReadingRepository.findByRoomAndServiceAndDateRange(
                        room.getId(), service, fromInstant, toInstant
                );
                BigDecimal totalConsumed = BigDecimal.ZERO;
                for (ServiceReading reading : readings) {
                    if (reading.getNewReading() != null && reading.getOldReading() != null) {
                        BigDecimal consumed = reading.getNewReading().subtract(reading.getOldReading());
                        if (consumed.compareTo(BigDecimal.ZERO) > 0) {
                            totalConsumed = totalConsumed.add(consumed);
                        }
                    }
                }
                if (totalConsumed.compareTo(BigDecimal.ZERO) > 0) {
                    LocalDate billDate = LocalDate.of(year, month, 1);
                    BigDecimal unitPrice = serviceService.getServicePriceAtDate(service.getId(), billDate);
                    BigDecimal amount = unitPrice.multiply(totalConsumed);
                    BillDetailResponse detail = new BillDetailResponse();
                    detail.setItemType(BillItemType.SERVICE);
                    detail.setDescription("Dịch vụ " + service.getServiceName() + " (" + service.getServiceType() + ") tháng " + String.format("%02d/%d", month, year));
                    detail.setServiceName(service.getServiceName());
                    detail.setUnitPriceAtBill(unitPrice);
                    detail.setConsumedUnits(totalConsumed);
                    detail.setItemAmount(amount);
                    result.add(detail);
                }
            } else if (service.getServiceType() == ServiceType.WATER || service.getServiceType() == ServiceType.OTHER) {
                LocalDate billDate = LocalDate.of(year, month, 1);
                BigDecimal unitPrice = serviceService.getServicePriceAtDate(service.getId(), billDate);
                
                // Tính số người trong phòng
                int numberOfPeople = 1; // Mặc định 1 người
                try {
                    Contract activeContract = contractRepository.findActiveByRoomId(roomId).orElse(null);
                    if (activeContract != null && activeContract.getRoomUsers() != null) {
                        numberOfPeople = (int) activeContract.getRoomUsers().stream()
                            .filter(ru -> Boolean.TRUE.equals(ru.getIsActive()))
                            .count();
                        if (numberOfPeople == 0) numberOfPeople = 1; // Đảm bảo ít nhất 1 người
                    }
                } catch (Exception e) {
                    // Nếu có lỗi, mặc định 1 người
                    numberOfPeople = 1;
                }
                
                BigDecimal totalAmount = unitPrice.multiply(BigDecimal.valueOf(numberOfPeople));
                
                BillDetailResponse detail = new BillDetailResponse();
                detail.setItemType(BillItemType.SERVICE);
                detail.setDescription("Dịch vụ " + service.getServiceName() + " (" + numberOfPeople + " người) tháng " + String.format("%02d/%d", month, year));
                detail.setServiceName(service.getServiceName());
                detail.setUnitPriceAtBill(unitPrice);
                detail.setConsumedUnits(BigDecimal.valueOf(numberOfPeople));
                detail.setItemAmount(totalAmount);
                result.add(detail);
            }
        }
        return result;
    }

    @Override
    public BillResponse createAndSaveServiceBill(Long roomId, int month, int year) {
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy phòng"));
        // Lấy contract active của phòng
        Contract contract = contractRepository.findActiveByRoomId(roomId)
                .orElseThrow(() -> new NotFoundException("Không có hợp đồng đang hoạt động cho phòng này"));
        ZoneId vnZone = ZoneId.of("Asia/Ho_Chi_Minh");
        LocalDate monthStart = LocalDate.of(year, month, 1);
        LocalDate monthEnd = monthStart.withDayOfMonth(monthStart.lengthOfMonth());
        Instant fromInstant = monthStart.atStartOfDay(vnZone).toInstant();
        Instant toInstant = monthEnd.atTime(23, 59).atZone(vnZone).toInstant();
        List<BillDetail> details = new ArrayList<>();
        BigDecimal totalAmount = BigDecimal.ZERO;
        List<CustomService> services = room.getServiceMappings().stream()
            .filter(mapping -> Boolean.TRUE.equals(mapping.getIsActive()) ||
                (mapping.getEndDate() == null || !mapping.getEndDate().isBefore(monthEnd)))
            .map(RoomServiceMapping::getService)
            .collect(Collectors.toList());
        for (CustomService service : services) {
            if (service.getServiceType() == ServiceType.ELECTRICITY) {
                List<ServiceReading> readings = serviceReadingRepository.findByRoomAndServiceAndDateRange(
                        room.getId(), service, fromInstant, toInstant
                );
                BigDecimal totalConsumed = BigDecimal.ZERO;
                for (ServiceReading reading : readings) {
                    if (reading.getNewReading() != null && reading.getOldReading() != null) {
                        BigDecimal consumed = reading.getNewReading().subtract(reading.getOldReading());
                        if (consumed.compareTo(BigDecimal.ZERO) > 0) {
                            totalConsumed = totalConsumed.add(consumed);
                        }
                    }
                }
                if (totalConsumed.compareTo(BigDecimal.ZERO) > 0) {
                    LocalDate billDate = LocalDate.of(year, month, 1);
                    BigDecimal unitPrice = serviceService.getServicePriceAtDate(service.getId(), billDate);
                    BigDecimal amount = unitPrice.multiply(totalConsumed);
                    BillDetail detail = new BillDetail();
                    detail.setItemType(BillItemType.SERVICE);
                    detail.setDescription("Dịch vụ " + service.getServiceName() + " (" + service.getServiceType() + ") tháng " + String.format("%02d/%d", month, year));
                    detail.setService(service);
                    detail.setUnitPriceAtBill(unitPrice);
                    detail.setConsumedUnits(totalConsumed);
                    detail.setItemAmount(amount);
                    detail.setCreatedDate(Instant.now());
                    details.add(detail);
                    totalAmount = totalAmount.add(amount);
                }
            } else if (service.getServiceType() == ServiceType.WATER || service.getServiceType() == ServiceType.OTHER) {
                LocalDate billDate = LocalDate.of(year, month, 1);
                BigDecimal unitPrice = serviceService.getServicePriceAtDate(service.getId(), billDate);
                
                // Tính số người trong phòng
                int numberOfPeople = 1; // Mặc định 1 người
                try {
                    if (contract.getRoomUsers() != null) {
                        numberOfPeople = (int) contract.getRoomUsers().stream()
                            .filter(ru -> Boolean.TRUE.equals(ru.getIsActive()))
                            .count();
                        if (numberOfPeople == 0) numberOfPeople = 1; // Đảm bảo ít nhất 1 người
                    }
                } catch (Exception e) {
                    // Nếu có lỗi, mặc định 1 người
                    numberOfPeople = 1;
                }
                
                BigDecimal serviceAmount = unitPrice.multiply(BigDecimal.valueOf(numberOfPeople));
                
                BillDetail detail = new BillDetail();
                detail.setItemType(BillItemType.SERVICE);
                detail.setDescription("Dịch vụ " + service.getServiceName() + " (" + numberOfPeople + " người) tháng " + String.format("%02d/%d", month, year));
                detail.setService(service);
                detail.setUnitPriceAtBill(unitPrice);
                detail.setConsumedUnits(BigDecimal.valueOf(numberOfPeople));
                detail.setItemAmount(serviceAmount);
                detail.setCreatedDate(Instant.now());
                details.add(detail);
                totalAmount = totalAmount.add(serviceAmount);
            }
        }
        Bill bill = new Bill();
        bill.setRoom(room);
        bill.setContract(contract);
        bill.setFromDate(fromInstant);
        bill.setToDate(toInstant);
        
        // 🆕 Tự động set dueDate = toDate + 7 ngày cho hóa đơn dịch vụ
        bill.setDueDate(toInstant.plusSeconds(7 * 24 * 60 * 60)); // +7 days
        
        bill.setBillType(BillType.SERVICE);
        bill.setBillDate(Instant.now());
        bill.setTotalAmount(totalAmount);
        bill.setStatus(false);
        bill.setPaymentCycle(contract.getPaymentCycle());
        bill.setBillDetails(details);
        for (BillDetail detail : details) {
            detail.setBill(bill);
        }
        billRepository.save(bill);
        sendBillNotificationToAllUsers(bill);
        return toResponse(bill);
    }

    @Override
    @Transactional
    public void deleteBillById(Long id) {
        Bill bill = billRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Không tìm thấy hóa đơn"));
        
        if (Boolean.TRUE.equals(bill.getStatus())) {
            throw new BusinessException("Không thể xóa hóa đơn đã thanh toán hoàn toàn.");
        }
        
        // 🆕 KIỂM TRA HÓA ĐƠN ĐÃ THANH TOÁN TỪNG PHẦN VÀ ĐƯỢC DUYỆT
        if (Boolean.TRUE.equals(bill.getIsPartiallyPaid())) {
            // Kiểm tra có payment history nào đã được duyệt (SUCCESS) không
            List<PaymentHistory> approvedPayments = paymentHistoryRepository
                .findByBillIdAndStatusOrderByPaymentDateDesc(id, "SUCCESS");
            
            if (!approvedPayments.isEmpty()) {
                throw new BusinessException("Không thể xóa hóa đơn đã thanh toán từng phần và được duyệt. Chỉ có thể xóa khi hóa đơn bị từ chối thanh toán.");
            }
        }
        
        // 🆕 KIỂM TRA XEM CÓ THANH TOÁN ĐANG XỬ LÝ KHÔNG (CẢ TIỀN MẶT VÀ VNPAY)
        if (bill.getPaymentUrlLockedUntil() != null && Instant.now().isBefore(bill.getPaymentUrlLockedUntil())) {
            long secondsLeft = java.time.Duration.between(Instant.now(), bill.getPaymentUrlLockedUntil()).getSeconds();
            long minutesLeft = (secondsLeft + 59) / 60; // làm tròn lên phút còn lại
            throw new BusinessException("Không thể xóa hóa đơn đang có thanh toán đang xử lý. Vui lòng đợi thanh toán hoàn tất hoặc hủy thanh toán trước. Thời gian còn lại: " + minutesLeft + " phút.");
        }
        
        // Kiểm tra xem có PaymentHistory nào đang PENDING không
        List<PaymentHistory> pendingPayments = paymentHistoryRepository.findByBillIdAndStatusOrderByPaymentDateDesc(id, "PENDING");
        if (!pendingPayments.isEmpty()) {
            throw new BusinessException("Không thể xóa hóa đơn đang có yêu cầu thanh toán tiền mặt đang chờ xử lý. Vui lòng xử lý các yêu cầu thanh toán trước.");
        }
        
        // 🆕 XÓA TẤT CẢ PAYMENT HISTORY TRƯỚC KHI XÓA HÓA ĐƠN
        // Điều này sẽ giải quyết lỗi foreign key constraint
        List<PaymentHistory> allPayments = paymentHistoryRepository.findByBillIdOrderByPaymentDateDesc(id);
        if (!allPayments.isEmpty()) {
            System.out.println("🗑️ Xóa " + allPayments.size() + " bản ghi thanh toán trước khi xóa hóa đơn #" + id);
            paymentHistoryRepository.deleteAll(allPayments);
        }
        
        // 🆕 XÓA TẤT CẢ BILL DETAILS TRƯỚC KHI XÓA HÓA ĐƠN
        if (bill.getBillDetails() != null && !bill.getBillDetails().isEmpty()) {
            System.out.println("🗑️ Xóa " + bill.getBillDetails().size() + " chi tiết hóa đơn trước khi xóa hóa đơn #" + id);
            billDetailRepository.deleteAll(bill.getBillDetails());
        }
        
        // 🆕 XÓA TẤT CẢ EMAIL SENT LOGS TRƯỚC KHI XÓA HÓA ĐƠN
        // Điều này sẽ giải quyết lỗi foreign key constraint với email_sent_logs
        List<EmailSentLog> emailLogs = emailSentLogRepository.findByBillIdOrderBySentAtDesc(id);
        if (!emailLogs.isEmpty()) {
            System.out.println("🗑️ Xóa " + emailLogs.size() + " bản ghi email log trước khi xóa hóa đơn #" + id);
            emailSentLogRepository.deleteAll(emailLogs);
        }
        
        // Bây giờ có thể xóa hóa đơn an toàn
        billRepository.deleteById(id);
        System.out.println("✅ Đã xóa hóa đơn #" + id + " thành công");
    }

    // 🆕 PHƯƠNG THỨC MỚI: KIỂM TRA TRẠNG THÁI HÓA ĐƠN CHI TIẾT
    public Map<String, Object> getBillDeletionStatus(Long billId) {
        Bill bill = billRepository.findById(billId)
            .orElseThrow(() -> new NotFoundException("Không tìm thấy hóa đơn"));
        
        Map<String, Object> status = new HashMap<>();
        status.put("billId", billId);
        status.put("billStatus", bill.getStatus());
        status.put("canDelete", true);
        status.put("reasons", new ArrayList<String>());
        
        // Kiểm tra hóa đơn đã thanh toán
        if (Boolean.TRUE.equals(bill.getStatus())) {
            status.put("canDelete", false);
            ((List<String>) status.get("reasons")).add("Hóa đơn đã thanh toán hoàn toàn");
        }
        
        // Kiểm tra paymentUrlLockedUntil
        if (bill.getPaymentUrlLockedUntil() != null) {
            if (Instant.now().isBefore(bill.getPaymentUrlLockedUntil())) {
                long secondsLeft = java.time.Duration.between(Instant.now(), bill.getPaymentUrlLockedUntil()).getSeconds();
                long minutesLeft = (secondsLeft + 59) / 60;
                status.put("canDelete", false);
                ((List<String>) status.get("reasons")).add("Có thanh toán đang xử lý (khóa trong " + minutesLeft + " phút nữa)");
                status.put("paymentUrlLockedUntil", bill.getPaymentUrlLockedUntil());
                status.put("timeRemainingMinutes", minutesLeft);
            } else {
                status.put("paymentUrlLockedUntil", bill.getPaymentUrlLockedUntil());
                status.put("timeRemainingMinutes", 0);
                ((List<String>) status.get("reasons")).add("Khóa thanh toán đã hết hạn (có thể xóa)");
            }
        } else {
            status.put("paymentUrlLockedUntil", null);
            status.put("timeRemainingMinutes", 0);
            ((List<String>) status.get("reasons")).add("Không có khóa thanh toán (có thể xóa)");
        }
        
        // Kiểm tra PENDING payments
        List<PaymentHistory> pendingPayments = paymentHistoryRepository.findByBillIdAndStatusOrderByPaymentDateDesc(billId, "PENDING");
        if (!pendingPayments.isEmpty()) {
            status.put("canDelete", false);
            ((List<String>) status.get("reasons")).add("Có " + pendingPayments.size() + " yêu cầu thanh toán tiền mặt đang chờ xử lý");
            status.put("pendingPaymentsCount", pendingPayments.size());
            status.put("pendingPayments", pendingPayments.stream()
                .map(ph -> Map.of(
                    "id", ph.getId(),
                    "amount", ph.getPaymentAmount(),
                    "method", ph.getPaymentMethod(),
                    "date", ph.getPaymentDate()
                ))
                .collect(Collectors.toList()));
        } else {
            status.put("pendingPaymentsCount", 0);
            ((List<String>) status.get("reasons")).add("Không có yêu cầu thanh toán tiền mặt đang chờ xử lý (có thể xóa)");
        }
        
        // Kiểm tra tất cả payment history
        List<PaymentHistory> allPayments = paymentHistoryRepository.findByBillIdOrderByPaymentDateDesc(billId);
        status.put("totalPaymentsCount", allPayments.size());
        status.put("paymentsByStatus", allPayments.stream()
            .collect(Collectors.groupingBy(
                PaymentHistory::getStatus,
                Collectors.counting()
            )));
        
        return status;
    }

    @Override
    public Page<Bill> filterBills(Long roomId, Boolean status, BigDecimal minPrice, BigDecimal maxPrice, String search, Pageable pageable) {
        Specification<Bill> spec = (root, query, cb) -> cb.conjunction();

        if (roomId != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("room").get("id"), roomId));
        }
        if (status != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("status"), status));
        }
        if (minPrice != null) {
            spec = spec.and((root, query, cb) -> cb.ge(root.get("totalAmount"), minPrice));
        }
        if (maxPrice != null) {
            spec = spec.and((root, query, cb) -> cb.le(root.get("totalAmount"), maxPrice));
        }
        if (search != null && !search.isEmpty()) {
            spec = spec.and((root, query, cb) -> cb.or(
                    cb.like(cb.lower(root.get("room").get("roomNumber")), "%" + search.toLowerCase() + "%"),
                    cb.like(cb.function("str", String.class, root.get("id")), "%" + search + "%")
            ));
        }

        return billRepository.findAll(spec, pageable);
    }

    @Override
    public BillResponse createCustomBill(Long roomId, String name, String description, BigDecimal amount, Instant fromDate, Instant toDate) {
        // 🆕 Validation ngày: toDate không được nhỏ hơn fromDate
        if (fromDate != null && toDate != null && toDate.isBefore(fromDate)) {
            throw new BusinessException("Ngày kết thúc không được nhỏ hơn ngày bắt đầu. Vui lòng kiểm tra lại.");
        }
        
        Room room = roomRepository.findById(roomId)
            .orElseThrow(() -> new NotFoundException("Không tìm thấy phòng"));
        // Kiểm tra hợp đồng active
        Contract contract = contractRepository.findActiveByRoomId(roomId)
            .orElseThrow(() -> new BusinessException("Phòng không có hợp đồng đang hoạt động. Không thể tạo hóa đơn."));

        Bill bill = new Bill();
        bill.setRoom(room);
        bill.setContract(contract);
        bill.setBillType(com.mpbhms.backend.enums.BillType.CUSTOM);
        bill.setBillDate(Instant.now());
        bill.setFromDate(fromDate);
        bill.setToDate(toDate);
        
        // 🆕 Tự động set dueDate = toDate + 7 ngày cho hóa đơn tùy chỉnh
        bill.setDueDate(toDate.plusSeconds(7 * 24 * 60 * 60)); // +7 days
        
        bill.setTotalAmount(amount);
        bill.setStatus(false);
        bill.setPaymentCycle(contract.getPaymentCycle());

        // Tạo bill detail
        BillDetail detail = new BillDetail();
        detail.setItemType(BillItemType.SERVICE);
        detail.setDescription(name + (description != null && !description.isEmpty() ? (": " + description) : ""));
        detail.setItemAmount(amount);
        detail.setCreatedDate(Instant.now());
        detail.setBill(bill);
        List<BillDetail> details = new ArrayList<>();
        details.add(detail);
        bill.setBillDetails(details);

        billRepository.save(bill);
        sendBillNotificationToAllUsers(bill);
        return toResponse(bill);
    }

    @Override
    public List<BillResponse> bulkGenerateBills() {
        System.out.println("\n🚀 BULK BILL GENERATION STARTED");
        List<BillResponse> generatedBills = new ArrayList<>();
        
        // Lấy tất cả hợp đồng ACTIVE
        List<Contract> activeContracts = contractRepository.findAll().stream()
            .filter(contract -> contract.getContractStatus() == ContractStatus.ACTIVE)
            .toList();
        
        System.out.println("📋 Found " + activeContracts.size() + " active contracts");
        
        LocalDate today = LocalDate.now();
        
        for (Contract contract : activeContracts) {
            try {
                System.out.println("\n--- Processing Contract #" + contract.getId() + " ---");
                System.out.println("Room: " + contract.getRoom().getRoomNumber());
                System.out.println("Payment Cycle: " + contract.getPaymentCycle());
                
                // Tính toán chu kỳ tiếp theo cần tạo bill
                LocalDate contractStart = contract.getContractStartDate().atZone(ZoneId.systemDefault()).toLocalDate();
                LocalDate contractEnd = contract.getContractEndDate().atZone(ZoneId.systemDefault()).toLocalDate();
                
                if (today.isAfter(contractEnd)) {
                    System.out.println("⏭️ Contract expired, skipping");
                    continue;
                }
                
                PaymentCycle cycle = contract.getPaymentCycle();
                LocalDate nextPeriodStart = calculateNextPeriodStart(contractStart, cycle, today);
                LocalDate nextPeriodEnd = calculatePeriodEnd(nextPeriodStart, cycle);
                
                // Đảm bảo không vượt quá ngày kết thúc hợp đồng
                if (nextPeriodEnd.isAfter(contractEnd)) {
                    nextPeriodEnd = contractEnd;
                }
                
                System.out.println("📅 Next period: " + nextPeriodStart + " to " + nextPeriodEnd);
                
                // Kiểm tra đã có bill cho chu kỳ này chưa
                boolean billExists = checkBillExists(contract.getId(), nextPeriodStart, nextPeriodEnd);
                
                if (billExists) {
                    System.out.println("Hóa đơn đã tồn tại cho kỳ này, bỏ qua");
                    continue;
                }
                
                // Tạo bill mới theo chu kỳ: MONTHLY => CONTRACT_TOTAL; QUARTERLY/YEARLY => chỉ tiền phòng
                BillType billTypeToGenerate = (cycle == PaymentCycle.MONTHLY)
                    ? BillType.CONTRACT_TOTAL
                    : BillType.CONTRACT_ROOM_RENT;
                Bill newBill = generateBill(contract.getId(), nextPeriodStart, nextPeriodEnd, billTypeToGenerate);
                generatedBills.add(toResponse(newBill));
                
                System.out.println("Đã tạo hóa đơn #" + newBill.getId() + " - Số tiền: " + newBill.getTotalAmount() + " VND");
                
            } catch (Exception e) {
                System.out.println("Lỗi xử lý hợp đồng #" + contract.getId() + ": " + e.getMessage());
                // Tiếp tục với contracts khác
            }
        }
        
        System.out.println("\n🏁 HOÀN THÀNH TẠO HÓA ĐƠN HÀNG LOẠT");
        System.out.println("Đã tạo " + generatedBills.size() + " hóa đơn mới");
        
        return generatedBills;
    }

    @Override
    public List<BillResponse> autoGenerateServiceBills() {
        System.out.println("\n🚀 AUTO SERVICE BILL GENERATION STARTED");
        List<BillResponse> generatedBills = new ArrayList<>();
        
        // Lấy tất cả hợp đồng ACTIVE
        List<Contract> activeContracts = contractRepository.findAll().stream()
            .filter(contract -> contract.getContractStatus() == ContractStatus.ACTIVE)
            .toList();
        
        System.out.println("📋 Found " + activeContracts.size() + " active contracts");
        
        LocalDate today = LocalDate.now();
        int currentMonth = today.getMonthValue();
        int currentYear = today.getYear();
        
        for (Contract contract : activeContracts) {
            try {
                System.out.println("\n--- Processing Service Bill for Contract #" + contract.getId() + " ---");
                System.out.println("Room: " + contract.getRoom().getRoomNumber());
                
                // Kiểm tra hợp đồng có hết hạn chưa
                LocalDate contractEnd = contract.getContractEndDate().atZone(ZoneId.systemDefault()).toLocalDate();
                if (today.isAfter(contractEnd)) {
                    System.out.println("⏭️ Contract expired, skipping");
                    continue;
                }
                
                // Kiểm tra đã có hóa đơn dịch vụ cho tháng này chưa
                boolean serviceExistsForMonth = billRepository.findAll().stream()
                    .anyMatch(bill -> 
                        bill.getContract().getId().equals(contract.getId()) &&
                        bill.getBillType() == BillType.SERVICE &&
                        bill.getFromDate().atZone(ZoneId.systemDefault()).getMonthValue() == currentMonth &&
                        bill.getFromDate().atZone(ZoneId.systemDefault()).getYear() == currentYear
                    );
                
                if (serviceExistsForMonth) {
                    System.out.println("Hóa đơn dịch vụ đã tồn tại cho tháng " + currentMonth + "/" + currentYear + ", bỏ qua");
                    continue;
                }
                
                // Tạo hóa đơn dịch vụ tự động
                try {
                    BillResponse serviceBill = createAndSaveServiceBill(contract.getRoom().getId(), currentMonth, currentYear);
                    generatedBills.add(serviceBill);
                    System.out.println("✅ Đã tạo hóa đơn dịch vụ #" + serviceBill.getId() + " - Số tiền: " + serviceBill.getTotalAmount() + " VND");
                } catch (Exception e) {
                    System.out.println("❌ Lỗi tạo hóa đơn dịch vụ cho phòng " + contract.getRoom().getRoomNumber() + ": " + e.getMessage());
                    // Tiếp tục với contracts khác
                }
                
            } catch (Exception e) {
                System.out.println("❌ Lỗi xử lý hợp đồng #" + contract.getId() + ": " + e.getMessage());
                // Tiếp tục với contracts khác
            }
        }
        
        System.out.println("\n🏁 HOÀN THÀNH TẠO HÓA ĐƠN DỊCH VỤ TỰ ĐỘNG");
        System.out.println("Đã tạo " + generatedBills.size() + " hóa đơn dịch vụ mới cho tháng " + currentMonth + "/" + currentYear);
        
        return generatedBills;
    }

    /**
     * Tính toán ngày bắt đầu chu kỳ tiếp theo
     */
    private LocalDate calculateNextPeriodStart(LocalDate contractStart, PaymentCycle cycle, LocalDate today) {
        int cycleMonths = countMonths(cycle);
        
        // Tìm chu kỳ hiện tại hoặc tiếp theo
        LocalDate periodStart = contractStart;
        
        while (periodStart.isBefore(today) || periodStart.equals(today)) {
            LocalDate periodEnd = calculatePeriodEnd(periodStart, cycle);
            
            // Nếu hôm nay nằm trong chu kỳ này, trả về chu kỳ này
            if (!today.isAfter(periodEnd)) {
                return periodStart;
            }
            
            // Chuyển sang chu kỳ tiếp theo
            periodStart = periodStart.plusMonths(cycleMonths);
        }
        
        return periodStart;
    }

    /**
     * Tính toán ngày kết thúc chu kỳ
     */
    private LocalDate calculatePeriodEnd(LocalDate periodStart, PaymentCycle cycle) {
        int cycleMonths = countMonths(cycle);
        return periodStart.plusMonths(cycleMonths).minusDays(1);
    }

    /**
     * Kiểm tra đã có bill cho chu kỳ này chưa
     */
    private boolean checkBillExists(Long contractId, LocalDate fromDate, LocalDate toDate) {
        ZoneId vnZone = ZoneId.of("Asia/Ho_Chi_Minh");
        Instant fromInstant = fromDate.atStartOfDay(vnZone).toInstant();
        Instant toInstant = toDate.atTime(23, 59).atZone(vnZone).toInstant();
        
        return billRepository.findAll().stream()
            .anyMatch(bill -> 
                bill.getContract().getId().equals(contractId) &&
                bill.getFromDate().equals(fromInstant) &&
                bill.getToDate().equals(toInstant)
            );
    }

    @Override
    public byte[] generateBillPdf(Long billId) {
        Bill bill = billRepository.findById(billId)
            .orElseThrow(() -> new NotFoundException("Không tìm thấy hóa đơn"));
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        Document document = new Document(PageSize.A4, 40, 40, 60, 40);
        try {
            // Load Arial font from resources
            InputStream fontStream = getClass().getClassLoader().getResourceAsStream("fonts/arial.ttf");
            if (fontStream == null) throw new RuntimeException("Không tìm thấy font Arial");
            byte[] fontBytes = fontStream.readAllBytes();
            BaseFont baseFont = BaseFont.createFont("arial.ttf", BaseFont.IDENTITY_H, BaseFont.EMBEDDED, BaseFont.CACHED, fontBytes, null);
            
            // Professional fonts
            Font titleFont = new Font(baseFont, 20, Font.BOLD);
            Font headerFont = new Font(baseFont, 12, Font.BOLD);
            Font normalFont = new Font(baseFont, 10, Font.NORMAL);
            Font smallFont = new Font(baseFont, 9, Font.NORMAL);

            PdfWriter.getInstance(document, baos);
            document.open();

            DateTimeFormatter dateFormatter = DateTimeFormatter.ofPattern("dd/MM/yyyy").withZone(ZoneId.systemDefault());

            // Professional header with company info
            Paragraph title = new Paragraph("HÓA ĐƠN THANH TOÁN", titleFont);
            title.setAlignment(Element.ALIGN_CENTER);
            title.setSpacingAfter(10f);
            document.add(title);
            
            Paragraph subtitle = new Paragraph("HỆ THỐNG QUẢN LÝ TÒA NHÀ MP-BHMS", normalFont);
            subtitle.setAlignment(Element.ALIGN_CENTER);
            subtitle.setSpacingAfter(25f);
            document.add(subtitle);
            
            // Invoice header info - clean layout
            PdfPTable headerTable = new PdfPTable(2);
            headerTable.setWidthPercentage(100);
            headerTable.setSpacingAfter(25f);
            
            PdfPCell leftHeader = new PdfPCell();
            leftHeader.setBorder(Rectangle.NO_BORDER);
            leftHeader.addElement(new Paragraph("Số hóa đơn: #" + String.format("%06d", bill.getId()), headerFont));
            leftHeader.addElement(new Paragraph("Ngày lập: " + dateFormatter.format(bill.getBillDate().atZone(ZoneId.systemDefault())), normalFont));
            
            PdfPCell rightHeader = new PdfPCell();
            rightHeader.setBorder(Rectangle.NO_BORDER);
            rightHeader.setHorizontalAlignment(Element.ALIGN_RIGHT);
            String statusText = bill.getStatus() ? "ĐÃ THANH TOÁN" : "CHƯA THANH TOÁN";
            Color statusColor = bill.getStatus() ? new Color(0, 128, 0) : new Color(255, 0, 0);
            Font statusFont = new Font(baseFont, 12, Font.BOLD, statusColor);
            rightHeader.addElement(new Paragraph("Trạng thái:", normalFont));
            rightHeader.addElement(new Paragraph(statusText, statusFont));
            
            headerTable.addCell(leftHeader);
            headerTable.addCell(rightHeader);
            document.add(headerTable);

            // Customer and Room Information - improved layout
            PdfPTable infoMainTable = new PdfPTable(2);
            infoMainTable.setWidthPercentage(100);
            infoMainTable.setSpacingAfter(25f);
            
            // Customer Info - TẤT CẢ thành viên trong phòng
            PdfPCell customerCell = new PdfPCell();
            customerCell.setBorder(Rectangle.BOX);
            customerCell.setPadding(15f);
            customerCell.setVerticalAlignment(Element.ALIGN_TOP);
            
            Paragraph customerTitle = new Paragraph("THÔNG TIN KHÁCH HÀNG", headerFont);
            customerTitle.setSpacingAfter(10f);
            customerCell.addElement(customerTitle);
            
            if (bill.getContract() != null && bill.getContract().getRoomUsers() != null) {
                int memberIndex = 1;
                for (RoomUser roomUser : bill.getContract().getRoomUsers()) {
                    if (roomUser.getUser() != null && roomUser.getUser().getUserInfo() != null && Boolean.TRUE.equals(roomUser.getIsActive())) {
                        if (memberIndex > 1) {
                            customerCell.addElement(new Paragraph(" ", normalFont)); // Spacing
                        }
                        customerCell.addElement(new Paragraph("Thành viên " + memberIndex + ":", new Font(baseFont, 10, Font.BOLD)));
                        customerCell.addElement(new Paragraph("• Họ tên: " + roomUser.getUser().getUserInfo().getFullName(), normalFont));
                        customerCell.addElement(new Paragraph("• SĐT: " + roomUser.getUser().getUserInfo().getPhoneNumber(), normalFont));
                        if (roomUser.getUser().getEmail() != null) {
                            customerCell.addElement(new Paragraph("• Email: " + roomUser.getUser().getEmail(), normalFont));
                        }
                        customerCell.addElement(new Paragraph("• Ngày vào ở: " + (roomUser.getJoinedAt() != null ? dateFormatter.format(roomUser.getJoinedAt().atZone(ZoneId.systemDefault())) : "N/A"), normalFont));
                        memberIndex++;
                    }
                }
                if (memberIndex == 1) {
                    customerCell.addElement(new Paragraph("Chưa có thành viên nào", normalFont));
                }
            }
            
            // Room Info
            PdfPCell roomCell = new PdfPCell();
            roomCell.setBorder(Rectangle.BOX);
            roomCell.setPadding(15f);
            roomCell.setVerticalAlignment(Element.ALIGN_TOP);
            
            Paragraph roomTitle = new Paragraph("THÔNG TIN PHÒNG", headerFont);
            roomTitle.setSpacingAfter(10f);
            roomCell.addElement(roomTitle);
            roomCell.addElement(new Paragraph("• Số phòng: " + bill.getRoom().getRoomNumber(), normalFont));
            if (bill.getRoom().getBuilding() != null && !bill.getRoom().getBuilding().isEmpty()) {
                roomCell.addElement(new Paragraph("• Tòa nhà: " + bill.getRoom().getBuilding(), normalFont));
            }
            if (bill.getContract() != null) {
                roomCell.addElement(new Paragraph("• Hợp đồng: #" + bill.getContract().getId(), normalFont));
            }
            
            // Thời gian tính tiền
            roomCell.addElement(new Paragraph(" ", normalFont));
            roomCell.addElement(new Paragraph("THỜI GIAN TÍNH TIỀN:", new Font(baseFont, 10, Font.BOLD)));
            roomCell.addElement(new Paragraph("• Từ ngày: " + dateFormatter.format(bill.getFromDate().atZone(ZoneId.systemDefault())), normalFont));
            roomCell.addElement(new Paragraph("• Đến ngày: " + dateFormatter.format(bill.getToDate().atZone(ZoneId.systemDefault())), normalFont));
            
            // Hạn thanh toán
            String roomDueDateText;
            if (bill.getDueDate() != null) {
                roomDueDateText = dateFormatter.format(bill.getDueDate().atZone(ZoneId.systemDefault()));
            } else {
                roomDueDateText = dateFormatter.format(bill.getToDate().plusSeconds(7 * 24 * 60 * 60).atZone(ZoneId.systemDefault()));
            }
            roomCell.addElement(new Paragraph("• Hạn thanh toán: " + roomDueDateText, normalFont));
            
            infoMainTable.addCell(customerCell);
            infoMainTable.addCell(roomCell);
            document.add(infoMainTable);

            // Invoice Details - professional table
            Paragraph detailsTitle = new Paragraph("CHI TIẾT HÓA ĐƠN", headerFont);
            detailsTitle.setSpacingAfter(15f);
            document.add(detailsTitle);
            
            PdfPTable detailTable = new PdfPTable(4);
            detailTable.setWidthPercentage(100);
            detailTable.setSpacingAfter(20f);
            detailTable.setWidths(new float[]{4f, 1.5f, 2f, 2f});
            
            // Header row with styling
            PdfPCell[] headerCells = {
                new PdfPCell(new Phrase("DIỄN GIẢI", headerFont)),
                new PdfPCell(new Phrase("SỐ LƯỢNG", headerFont)),
                new PdfPCell(new Phrase("ĐƠN GIÁ", headerFont)),
                new PdfPCell(new Phrase("THÀNH TIỀN", headerFont))
            };
            
            for (PdfPCell cell : headerCells) {
                cell.setBackgroundColor(new Color(240, 240, 240));
                cell.setPadding(8f);
                cell.setHorizontalAlignment(Element.ALIGN_CENTER);
                detailTable.addCell(cell);
            }
            
            BigDecimal totalAmount = BigDecimal.ZERO;
            for (BillDetail detail : bill.getBillDetails()) {
                // Description
                PdfPCell descCell = new PdfPCell(new Phrase(detail.getDescription(), normalFont));
                descCell.setPadding(8f);
                detailTable.addCell(descCell);
                
                // Quantity - center aligned
                String quantity = detail.getConsumedUnits() != null ? 
                    new java.text.DecimalFormat("#,###.##").format(detail.getConsumedUnits()) : "1";
                PdfPCell qtyCell = new PdfPCell(new Phrase(quantity, normalFont));
                qtyCell.setPadding(8f);
                qtyCell.setHorizontalAlignment(Element.ALIGN_CENTER);
                detailTable.addCell(qtyCell);
                
                // Unit Price - right aligned
                String unitPrice = detail.getUnitPriceAtBill() != null ? formatCurrency(detail.getUnitPriceAtBill()) : "-";
                PdfPCell priceCell = new PdfPCell(new Phrase(unitPrice, normalFont));
                priceCell.setPadding(8f);
                priceCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
                detailTable.addCell(priceCell);
                
                // Amount - right aligned
                String amount = detail.getItemAmount() != null ? formatCurrency(detail.getItemAmount()) : "-";
                PdfPCell amountCell = new PdfPCell(new Phrase(amount, normalFont));
                amountCell.setPadding(8f);
                amountCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
                detailTable.addCell(amountCell);
                
                if (detail.getItemAmount() != null) {
                    totalAmount = totalAmount.add(detail.getItemAmount());
                }
            }
            document.add(detailTable);

            // Payment Summary - professional layout
            PdfPTable summaryTable = new PdfPTable(2);
            summaryTable.setWidthPercentage(60);
            summaryTable.setHorizontalAlignment(Element.ALIGN_RIGHT);
            summaryTable.setSpacingAfter(25f);
            summaryTable.setWidths(new float[]{3f, 2f});
            
            // Total amount
            PdfPCell totalLabelCell = new PdfPCell(new Phrase("TỔNG CỘNG:", headerFont));
            totalLabelCell.setPadding(10f);
            totalLabelCell.setBackgroundColor(new Color(240, 240, 240));
            totalLabelCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
            
            PdfPCell totalValueCell = new PdfPCell(new Phrase(formatCurrency(totalAmount), headerFont));
            totalValueCell.setPadding(10f);
            totalValueCell.setBackgroundColor(new Color(240, 240, 240));
            totalValueCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
            
            summaryTable.addCell(totalLabelCell);
            summaryTable.addCell(totalValueCell);
            
            // Thông tin thanh toán từng phần nếu có
            if (Boolean.TRUE.equals(bill.getIsPartiallyPaid())) {
                // Đã thanh toán (gốc)
                summaryTable.addCell(new PdfPCell(new Phrase("Đã thanh toán (gốc):", normalFont)) {{ setPadding(8f); setHorizontalAlignment(Element.ALIGN_RIGHT); }});
                summaryTable.addCell(new PdfPCell(new Phrase(formatCurrency(bill.getPaidAmount() != null ? bill.getPaidAmount() : BigDecimal.ZERO), normalFont)) {{ setPadding(8f); setHorizontalAlignment(Element.ALIGN_RIGHT); }});
                
                // Phí thanh toán từng phần
                if (bill.getPartialPaymentFeesCollected() != null && bill.getPartialPaymentFeesCollected().compareTo(BigDecimal.ZERO) > 0) {
                    summaryTable.addCell(new PdfPCell(new Phrase("Phí thanh toán từng phần:", normalFont)) {{ setPadding(8f); setHorizontalAlignment(Element.ALIGN_RIGHT); }});
                    summaryTable.addCell(new PdfPCell(new Phrase(formatCurrency(bill.getPartialPaymentFeesCollected()), normalFont)) {{ setPadding(8f); setHorizontalAlignment(Element.ALIGN_RIGHT); }});
                }
                
                // Còn nợ
                Color debtColor = bill.getOutstandingAmount() != null && bill.getOutstandingAmount().compareTo(BigDecimal.ZERO) > 0 ? 
                    new Color(255, 77, 79) : new Color(82, 196, 26);
                Font debtFont = new Font(baseFont, 11, Font.BOLD, debtColor);
                
                PdfPCell debtLabelCell = new PdfPCell(new Phrase("CÒN NỢ:", debtFont));
                debtLabelCell.setPadding(10f);
                debtLabelCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
                debtLabelCell.setBackgroundColor(new Color(250, 250, 250));
                
                PdfPCell debtValueCell = new PdfPCell(new Phrase(formatCurrency(bill.getOutstandingAmount() != null ? bill.getOutstandingAmount() : BigDecimal.ZERO), debtFont));
                debtValueCell.setPadding(10f);
                debtValueCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
                debtValueCell.setBackgroundColor(new Color(250, 250, 250));
                
                summaryTable.addCell(debtLabelCell);
                summaryTable.addCell(debtValueCell);
            }
            
            document.add(summaryTable);

            // Payment Information (only if not paid)
            if (!bill.getStatus()) {
                Paragraph paymentTitle = new Paragraph("THÔNG TIN THANH TOÁN", headerFont);
                paymentTitle.setSpacingAfter(10f);
                document.add(paymentTitle);
                
                PdfPTable paymentTable = new PdfPTable(2);
                paymentTable.setWidthPercentage(100);
                paymentTable.setSpacingAfter(20f);
                paymentTable.setWidths(new float[]{1f, 1f});
                
                PdfPCell methodCell = new PdfPCell(new Phrase("Phương thức thanh toán: VNPay / Tiền mặt", normalFont));
                methodCell.setPadding(8f);
                methodCell.setBorder(Rectangle.BOX);
                
                String dueDateText = bill.getDueDate() != null ? 
                    dateFormatter.format(bill.getDueDate().atZone(ZoneId.systemDefault())) : 
                    "Chưa thiết lập";
                PdfPCell dueDateCell = new PdfPCell(new Phrase("Hạn thanh toán: " + dueDateText, normalFont));
                dueDateCell.setPadding(8f);
                dueDateCell.setBorder(Rectangle.BOX);
                
                paymentTable.addCell(methodCell);
                paymentTable.addCell(dueDateCell);
                document.add(paymentTable);
            }

            // Professional footer
            Paragraph footer = new Paragraph("Cảm ơn quý khách đã sử dụng dịch vụ của chúng tôi!", smallFont);
            footer.setAlignment(Element.ALIGN_CENTER);
            footer.setSpacingBefore(30f);
            document.add(footer);
            
            Paragraph contactInfo = new Paragraph("Liên hệ: MP-BHMS | Email: support@mpbhms.online", smallFont);
            contactInfo.setAlignment(Element.ALIGN_CENTER);
            contactInfo.setSpacingAfter(10f);
            document.add(contactInfo);

            document.close();
        } catch (Exception e) {
            throw new RuntimeException("Error generating PDF", e);
        }
        return baos.toByteArray();
    }

    @Override
    public Page<Bill> getBillsByUserId(Long userId, Pageable pageable) {
        return billRepository.findDistinctByContract_RoomUsers_User_Id(userId, pageable);
    }

    @Override
    public long countUnpaid() {
        return billRepository.countByStatusFalse();
    }
    @Override
    public long countPaid() {
        return billRepository.countByStatusTrue();
    }
    @Override
    public long countOverdue() {
        Instant now = Instant.now();
        Instant sevenDaysAgo = now.minusSeconds(7 * 24 * 60 * 60); // 7 ngày trước (từ ngày thứ 7 trở đi)
        return billRepository.countOverdue(sevenDaysAgo);
    }

    @Override
    public BigDecimal getTotalRevenue() {
        return billRepository.getTotalRevenue();
    }
    @Override
    public java.util.List<com.mpbhms.backend.dto.RevenueMonthDTO> getRevenueByMonth(int months) {
        java.time.Instant from = java.time.LocalDate.now().minusMonths(months-1).withDayOfMonth(1).atStartOfDay(java.time.ZoneId.systemDefault()).toInstant();
        java.util.List<Object[]> raw = billRepository.getRevenueByMonth(from);
        java.util.List<com.mpbhms.backend.dto.RevenueMonthDTO> result = new java.util.ArrayList<>();
        for (Object[] row : raw) {
            result.add(new com.mpbhms.backend.dto.RevenueMonthDTO((String)row[0], (java.math.BigDecimal)row[1]));
        }
        return result;
    }

    @Override
    public BigDecimal getMonthRevenue(String month) {
        return billRepository.getMonthRevenue(month);
    }
    
    @Override
    public Map<String, BigDecimal> getRevenueBreakdown() {
        Map<String, BigDecimal> breakdown = new HashMap<>();
        
        // Doanh thu từ hóa đơn (tiền gốc)
        BigDecimal billRevenue = billRepository.getTotalBillRevenue();
        
        // Doanh thu từ phí thanh toán từng phần
        BigDecimal feeRevenue = billRepository.getTotalFeeRevenue();
        
        // Tổng số tiền từ thanh toán từng phần (không bao gồm phí)
        BigDecimal partialPayments = billRevenue;
        
        breakdown.put("billRevenue", billRevenue != null ? billRevenue : BigDecimal.ZERO);
        breakdown.put("feeRevenue", feeRevenue != null ? feeRevenue : BigDecimal.ZERO);
        breakdown.put("partialPayments", partialPayments != null ? partialPayments : BigDecimal.ZERO);
        
        return breakdown;
    }
    
    @Override
    public long countPartiallyPaidBills() {
        return billRepository.countPartiallyPaidBills();
    }

    // Gửi notification cho từng user trong phòng ứng với hợp đồng khi gửi bill
    private void sendBillNotificationToAllUsers(Bill bill) {
        Contract contract = bill.getContract();
        if (contract.getRoomUsers() != null) {
            for (RoomUser ru : contract.getRoomUsers()) {
                if (ru.getUser() != null && Boolean.TRUE.equals(ru.getIsActive())) {
                    NotificationDTO noti = new NotificationDTO();
                    noti.setRecipientId(ru.getUser().getId());
                    noti.setTitle("Hóa đơn mới cho phòng " + contract.getRoom().getRoomNumber());
                    noti.setMessage("Bạn có hóa đơn mới #" + bill.getId() + " từ " +
                        bill.getFromDate().atZone(java.time.ZoneId.systemDefault()).toLocalDate() + " đến " +
                        bill.getToDate().atZone(java.time.ZoneId.systemDefault()).toLocalDate() + ". Vui lòng kiểm tra và thanh toán.");
                    noti.setType(NotificationType.ANNOUNCEMENT); // Use general announcement for bill creation
                    noti.setMetadata("{\"billId\":" + bill.getId() + "}");
                    notificationService.createAndSend(noti);
                }
            }
        }
    }

    @Override
    public BillResponse updatePaymentStatus(Long billId, Boolean status) {
        Bill bill = billRepository.findById(billId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy hóa đơn với ID: " + billId));
        
        bill.setStatus(status);
        
        // Nếu đánh dấu là đã thanh toán, cập nhật ngày thanh toán và outstandingAmount
        if (status) {
            bill.setPaidDate(Instant.now());
            // 🆕 Đảm bảo outstandingAmount = 0 khi hóa đơn được đánh dấu là đã thanh toán
            bill.setOutstandingAmount(BigDecimal.ZERO);
            bill.setIsPartiallyPaid(false);
            // 🆕 Cập nhật paidAmount để phản ánh rằng hóa đơn đã được thanh toán đầy đủ
            if (bill.getPaidAmount() == null || bill.getPaidAmount().compareTo(BigDecimal.ZERO) == 0) {
                bill.setPaidAmount(bill.getTotalAmount());
                System.out.println("💰 Cập nhật paidAmount: " + bill.getTotalAmount() + " cho hóa đơn #" + bill.getId());
            }
        } else {
            bill.setPaidDate(null);
            // 🆕 Nếu bỏ đánh dấu đã thanh toán, tính lại outstandingAmount
            bill.calculateOutstandingAmount();
        }
        
        Bill updatedBill = billRepository.save(bill);
        
        // 🆕 Xóa khỏi cache cảnh báo nếu bill được thanh toán
        if (status) {
            warningSentBills.remove(billId);
            System.out.println("[" + java.time.LocalDateTime.now() + "] Đã xóa hóa đơn #" + billId + " khỏi cache cảnh báo (đã thanh toán)");

            // 🆕 Gửi email/notification xác nhận đã thanh toán khi bấm nút "Đã thanh toán"
            try {
                sendBillPaidConfirmation(updatedBill);
            } catch (Exception e) {
                System.err.println("Lỗi gửi xác nhận đã thanh toán (manual): " + e.getMessage());
            }
        }
        
        return toResponse(updatedBill);
    }

    @Override
    @Transactional
    public PartialPaymentResponse makePartialPayment(PartialPaymentRequest request) {
        // Tìm hóa đơn
        Bill bill = billRepository.findById(request.getBillId())
                .orElseThrow(() -> new NotFoundException("Không tìm thấy hóa đơn với ID: " + request.getBillId()));
        
        // Kiểm tra hóa đơn đã thanh toán hết chưa
        if (Boolean.TRUE.equals(bill.getStatus())) {
            throw new BusinessException("Hóa đơn đã được thanh toán đầy đủ");
        }
        
        // Kiểm tra số tiền thanh toán hợp lệ
        if (request.getPaymentAmount() == null || request.getPaymentAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("Số tiền thanh toán phải lớn hơn 0");
        }
        
        // Kiểm tra số tiền thanh toán không vượt quá số tiền còn nợ
        BigDecimal outstandingAmount = bill.getOutstandingAmount() != null ? bill.getOutstandingAmount() : bill.getTotalAmount();
        if (request.getPaymentAmount().compareTo(outstandingAmount) > 0) {
            throw new BusinessException("Số tiền thanh toán không được vượt quá số tiền còn nợ: " + formatCurrency(outstandingAmount));
        }
        
        // 🆕 KIỂM TRA KHOẢNG THỜI GIAN 30 NGÀY GIỮA CÁC LẦN THANH TOÁN TỪNG PHẦN
        if (Boolean.TRUE.equals(bill.getIsPartiallyPaid()) && bill.getLastPaymentDate() != null) {
            Instant currentDate = Instant.now();
            Instant lastPaymentDate = bill.getLastPaymentDate();
            
            // Tính số ngày từ lần thanh toán cuối cùng
            long daysSinceLastPayment = java.time.Duration.between(lastPaymentDate, currentDate).toDays();
            
            if (daysSinceLastPayment < 30) {
                long remainingDays = 30 - daysSinceLastPayment;
                throw new BusinessException("Bạn phải đợi thêm " + remainingDays + " ngày nữa mới được thanh toán từng phần tiếp theo. " +
                    "Khoảng thời gian tối thiểu giữa các lần thanh toán từng phần là 30 ngày.");
            }
        }
        
        // Lưu số tiền đã thanh toán trước đó
        BigDecimal previousPaidAmount = bill.getPaidAmount() != null ? bill.getPaidAmount() : BigDecimal.ZERO;
        
        // 🆕 Xử lý logic mới cho thanh toán từng phần
        // 1. Tính lãi suất trước khi thanh toán
        Instant currentDate = Instant.now();
        Instant dueDate = bill.getDueDate() != null ? bill.getDueDate() : 
            bill.getToDate().plusSeconds(7 * 24 * 60 * 60); // toDate + 7 days (default)
        
        BigDecimal interestAmount = interestCalculationService.calculateInterest(
            outstandingAmount, dueDate, currentDate);
        
        int monthsOverdue = interestCalculationService.calculateMonthsOverdue(dueDate, currentDate);
        
        // 2. Thực hiện thanh toán
        bill.addPayment(request.getPaymentAmount());
        
        // 3. Cập nhật thông tin lãi suất
        bill.setInterestAmount(interestAmount);
        bill.setMonthsOverdue(monthsOverdue);
        bill.setLastInterestCalculationDate(currentDate);
        
        // 4. Cập nhật dueDate: cộng thêm 30 ngày mỗi lần thanh toán từng phần
        Instant newDueDate = dueDate.plusSeconds(30 * 24 * 60 * 60); // +30 days
        bill.setDueDate(newDueDate);
        
        // 5. Đánh dấu là thanh toán từng phần
        bill.setIsPartiallyPaid(true);
        bill.setLastPaymentDate(currentDate);
        
        // 6. Kiểm tra xem hóa đơn đã được thanh toán đầy đủ chưa
        // Chỉ cập nhật status khi outstandingAmount = 0 (đã thanh toán hết)
        if (bill.getOutstandingAmount().compareTo(BigDecimal.ZERO) <= 0) {
            bill.setStatus(true);
            bill.setPaidDate(currentDate);
            System.out.println("✅ Hóa đơn #" + bill.getId() + " đã được thanh toán đầy đủ!");

            // 🆕 Gửi email + thông báo "đã thanh toán hoàn toàn"
            try {
                // Gửi email xác nhận đã thanh toán
                if (bill.getContract() != null && bill.getContract().getRoomUsers() != null) {
                    var mainRenter = bill.getContract().getRoomUsers().stream()
                        .filter(ru -> ru.getUser() != null && Boolean.TRUE.equals(ru.getIsActive()) && ru.getUser().getEmail() != null)
                        .findFirst().orElse(null);
                    if (mainRenter != null) {
                        String content = "<h2>Hóa đơn đã được thanh toán đầy đủ</h2>" +
                            "<p>Xin chúc mừng! Hóa đơn #" + bill.getId() + " đã được thanh toán đầy đủ.</p>" +
                            "<ul>" +
                            "<li><strong>Phòng:</strong> " + bill.getRoom().getRoomNumber() + "</li>" +
                            "<li><strong>Tổng tiền:</strong> " + formatCurrency(bill.getTotalAmount()) + "</li>" +
                            "<li><strong>Đã thanh toán (gốc):</strong> " + formatCurrency(bill.getPaidAmount()) + "</li>" +
                            "<li><strong>Còn nợ:</strong> 0 VNĐ</li>" +
                            "<li><strong>Ngày thanh toán:</strong> " + formatDateTime(bill.getPaidDate()) + "</li>" +
                            "</ul>";
                        emailService.sendNotificationEmail(
                            mainRenter.getUser().getEmail(),
                            "Xác nhận đã thanh toán - Hóa đơn #" + bill.getId(),
                            content
                        );
                    }
                }

                // Notification hệ thống
                if (bill.getContract() != null && bill.getContract().getRoomUsers() != null) {
                    for (RoomUser ru : bill.getContract().getRoomUsers()) {
                        if (ru.getUser() != null && Boolean.TRUE.equals(ru.getIsActive())) {
                            NotificationDTO noti = new NotificationDTO();
                            noti.setRecipientId(ru.getUser().getId());
                            noti.setTitle("Hóa đơn đã được thanh toán");
                            noti.setMessage("Hóa đơn #" + bill.getId() + " đã thanh toán đầy đủ. Cảm ơn bạn!");
                            noti.setType(NotificationType.ANNOUNCEMENT);
                            noti.setMetadata("{\"billId\":" + bill.getId() + "}");
                            notificationService.createAndSend(noti);
                        }
                    }
                }
            } catch (Exception e) {
                System.err.println("Lỗi gửi xác nhận đã thanh toán: " + e.getMessage());
            }
        } else {
            // Đảm bảo status = false nếu vẫn còn nợ
            bill.setStatus(false);
            System.out.println("⚠️ Hóa đơn #" + bill.getId() + " vẫn còn nợ: " + bill.getOutstandingAmount());
        }
        
        System.out.println("🆕 Thanh toán từng phần cho hóa đơn #" + bill.getId() + 
            " - DueDate cũ: " + dueDate + 
            " - DueDate mới: " + newDueDate + 
            " - Số tiền thanh toán: " + request.getPaymentAmount() + 
            " - Số tiền còn nợ: " + bill.getOutstandingAmount() +
            " - Lãi suất: " + interestAmount +
            " - Tháng quá hạn: " + monthsOverdue +
            " - Trạng thái: " + bill.getStatus());
        
        // Lưu hóa đơn
        Bill savedBill = billRepository.save(bill);
        
        // 🆕 Tạo lịch sử thanh toán và cập nhật phí thanh toán từng phần
        // Chỉ tạo PaymentHistory nếu không có flag skipPaymentHistoryCreation
        if (!Boolean.TRUE.equals(request.getSkipPaymentHistoryCreation())) {
            try {
                // Tính tổng số tiền (bao gồm phí)
                BigDecimal totalAmount = request.getPaymentAmount();
                BigDecimal partialPaymentFee = BigDecimal.ZERO;
                BigDecimal overdueInterest = BigDecimal.ZERO;
                
                // Tính phí thanh toán từng phần nếu có
                if (Boolean.TRUE.equals(bill.getIsPartiallyPaid())) {
                    int paymentCount = getPaymentCount(bill.getId());
                    partialPaymentFee = calculateNextPaymentFee(paymentCount);
                    totalAmount = totalAmount.add(partialPaymentFee);
                    
                    // 🆕 Cộng phí thanh toán từng phần vào trường riêng
                    bill.addPartialPaymentFee(partialPaymentFee);
                    System.out.println("💰 Đã cộng phí thanh toán từng phần: " + partialPaymentFee + 
                        " vào tổng phí đã thu: " + bill.getPartialPaymentFeesCollected());
                }
                
                // Tính lãi suất quá hạn nếu có
                if (interestAmount.compareTo(BigDecimal.ZERO) > 0) {
                    overdueInterest = interestAmount;
                    totalAmount = totalAmount.add(overdueInterest);
                }
                
                // Tạo lịch sử thanh toán
                paymentHistoryService.createPaymentHistory(
                    bill.getId(),
                    request.getPaymentAmount(), // Số tiền gốc
                    totalAmount, // Tổng số tiền (bao gồm phí)
                    partialPaymentFee,
                    overdueInterest,
                    request.getPaymentMethod(),
                    null, // transactionId (sẽ được cập nhật sau nếu cần)
                    request.getNotes()
                );
                
                System.out.println("📝 Đã tạo lịch sử thanh toán cho hóa đơn #" + bill.getId());
            } catch (Exception e) {
                System.out.println("⚠️ Lỗi khi tạo lịch sử thanh toán: " + e.getMessage());
                // Không throw exception để không ảnh hưởng đến thanh toán chính
            }
        } else {
            System.out.println("🔄 Bỏ qua tạo PaymentHistory (skipPaymentHistoryCreation = true)");
        }
        
        // Tạo response
        PartialPaymentResponse response = new PartialPaymentResponse();
        response.setBillId(bill.getId());
        response.setPaymentAmount(request.getPaymentAmount());
        response.setPreviousPaidAmount(previousPaidAmount);
        response.setNewPaidAmount(bill.getPaidAmount());
        response.setOutstandingAmount(bill.getOutstandingAmount());
        response.setIsFullyPaid(bill.getStatus());
        response.setPaymentDate(Instant.now());
        response.setPaymentMethod(request.getPaymentMethod());
        response.setNotes(request.getNotes());
        response.setInterestAmount(interestAmount);
        response.setMonthsOverdue(monthsOverdue);
        
        // Tạo message
        if (bill.getStatus()) {
            response.setMessage("Thanh toán thành công! Hóa đơn đã được thanh toán đầy đủ.");
        } else {
            String message = "Thanh toán thành công! Số tiền còn nợ: " + formatCurrency(bill.getOutstandingAmount()) + 
                ". Hạn thanh toán đã được gia hạn thêm 30 ngày.";
            
            // Thêm thông tin lãi suất nếu có
            if (interestAmount.compareTo(BigDecimal.ZERO) > 0) {
                message += " Lãi suất áp dụng: " + formatCurrency(interestAmount) + 
                    " (quá hạn " + monthsOverdue + " tháng).";
            }
            
            response.setMessage(message);
        }
        
        // Gửi thông báo
        sendPartialPaymentNotification(savedBill, request.getPaymentAmount());
        
        return response;
    }
    
    // Gửi thông báo thanh toán từng phần
    private void sendPartialPaymentNotification(Bill bill, BigDecimal paymentAmount) {
        try {
            // Gửi thông báo cho tất cả người thuê trong phòng
            if (bill.getContract().getRoomUsers() != null) {
                for (RoomUser roomUser : bill.getContract().getRoomUsers()) {
                    if (roomUser.getUser() != null && Boolean.TRUE.equals(roomUser.getIsActive())) {
                        NotificationDTO notification = new NotificationDTO();
                        notification.setTitle("Thanh toán hóa đơn thành công");
                                String notificationMessage = "Bạn đã thanh toán " + formatCurrency(paymentAmount) + " cho hóa đơn #" + bill.getId() +
                ". Số tiền còn nợ: " + formatCurrency(bill.getOutstandingAmount());
                        
                        if (!bill.getStatus()) {
                            notificationMessage += ". Hạn thanh toán đã được gia hạn thêm 30 ngày.";
                        }
                        
                        notification.setMessage(notificationMessage);
                        notification.setType(NotificationType.ANNOUNCEMENT);
                        notification.setRecipientId(roomUser.getUser().getId());
                        notification.setMetadata("{\"billId\":" + bill.getId() + ",\"paymentAmount\":" + paymentAmount + ",\"outstandingAmount\":" + bill.getOutstandingAmount() + "}");
                        
                        notificationService.createAndSend(notification);
                    }
                }
            }
            
            // Gửi email thông báo cho người thuê chính
            if (bill.getContract().getRoomUsers() != null && !bill.getContract().getRoomUsers().isEmpty()) {
                RoomUser mainRenter = bill.getContract().getRoomUsers().stream()
                    .filter(ru -> ru.getUser() != null && Boolean.TRUE.equals(ru.getIsActive()))
                    .findFirst()
                    .orElse(null);
                
                if (mainRenter != null && mainRenter.getUser().getEmail() != null) {
                    String emailContent = buildPartialPaymentEmailContent(bill, paymentAmount);
                    emailService.sendNotificationEmail(
                        mainRenter.getUser().getEmail(),
                        "Thanh toán hóa đơn thành công - Hóa đơn #" + bill.getId(),
                        emailContent
                    );
                }
            }
            
            // Tạo thông báo cho chủ nhà
            NotificationDTO landlordNotification = new NotificationDTO();
            landlordNotification.setTitle("Thanh toán hóa đơn từ người thuê");
            landlordNotification.setMessage("Người thuê phòng " + bill.getRoom().getRoomNumber() + 
                " đã thanh toán " + formatCurrency(paymentAmount) + " cho hóa đơn #" + bill.getId());
            landlordNotification.setType(NotificationType.ANNOUNCEMENT);
            landlordNotification.setRecipientId(bill.getRoom().getLandlord().getId());
            landlordNotification.setMetadata("{\"billId\":" + bill.getId() + ",\"roomNumber\":\"" + bill.getRoom().getRoomNumber() + "\",\"paymentAmount\":" + paymentAmount + "}");
            
            notificationService.createAndSend(landlordNotification);
            
        } catch (Exception e) {
            System.err.println("Lỗi khi gửi thông báo thanh toán từng phần: " + e.getMessage());
        }
    }
    
    @Override
    public String buildPartialPaymentEmailContent(Bill bill, BigDecimal paymentAmount) {
        // Lấy tên người thuê từ RoomUser
        String renterName = "Người thuê";
        if (bill.getContract().getRoomUsers() != null && !bill.getContract().getRoomUsers().isEmpty()) {
            RoomUser firstRenter = bill.getContract().getRoomUsers().stream()
                .filter(ru -> ru.getUser() != null && Boolean.TRUE.equals(ru.getIsActive()))
                .findFirst()
                .orElse(null);
            if (firstRenter != null && firstRenter.getUser() != null && firstRenter.getUser().getUserInfo() != null) {
                renterName = firstRenter.getUser().getUserInfo().getFullName();
            }
        }
        
        StringBuilder contentBody = new StringBuilder();
        contentBody.append("<div style='background-color: #e6f7ff; border: 1px solid #91d5ff; border-radius: 6px; padding: 20px; margin-bottom: 25px;'>");
        contentBody.append("<h3 style='color: #0050b3; margin: 0 0 15px 0; font-size: 18px;'>Thông tin hóa đơn</h3>");
        contentBody.append("<table style='width: 100%; border-collapse: collapse;'>");
        contentBody.append("<tr><td style='padding: 8px 0; font-weight: bold; color: #333;'>Phòng:</td><td style='padding: 8px 0; color: #666;'>").append(bill.getRoom().getRoomNumber()).append("</td></tr>");
        contentBody.append("<tr><td style='padding: 8px 0; font-weight: bold; color: #333;'>Mã hóa đơn:</td><td style='padding: 8px 0; color: #666;'>#").append(bill.getId()).append("</td></tr>");
        contentBody.append("<tr><td style='padding: 8px 0; font-weight: bold; color: #333;'>Tổng tiền:</td><td style='padding: 8px 0; color: #1890ff; font-weight: bold; font-size: 16px;'>").append(formatCurrency(bill.getTotalAmount())).append("</td></tr>");
        contentBody.append("<tr><td style='padding: 8px 0; font-weight: bold; color: #333;'>Đã thanh toán (gốc):</td><td style='padding: 8px 0; color: #52c41a; font-weight: bold;'>").append(formatCurrency(bill.getPaidAmount())).append("</td></tr>");
        contentBody.append("<tr><td style='padding: 8px 0; font-weight: bold; color: #333;'>Còn nợ:</td><td style='padding: 8px 0; color: #ff4d4f; font-weight: bold;'>").append(formatCurrency(bill.getOutstandingAmount())).append("</td></tr>");
        contentBody.append("<tr><td style='padding: 8px 0; font-weight: bold; color: #333;'>Ngày thanh toán:</td><td style='padding: 8px 0; color: #666;'>").append(formatDateTime(bill.getLastPaymentDate())).append("</td></tr>");
        contentBody.append("</table>");
        contentBody.append("</div>");
        
        // Thông báo
        contentBody.append("<div style='background-color: #f6ffed; border: 1px solid #b7eb8f; border-radius: 6px; padding: 20px; margin-bottom: 25px;'>");
        contentBody.append("<h3 style='color: #389e0d; margin: 0 0 15px 0; font-size: 18px;'>Thông báo</h3>");
        contentBody.append("<p style='margin: 0; color: #389e0d;'>Xin chào ").append(renterName).append(", bạn đã thanh toán thành công <strong>").append(formatCurrency(paymentAmount)).append("</strong> cho hóa đơn #").append(bill.getId()).append(".</p>");
        
        if (bill.getStatus()) {
            contentBody.append("<p style='color: #52c41a; font-weight: bold; margin-top: 10px;'>🎉 Chúc mừng! Hóa đơn đã được thanh toán đầy đủ.</p>");
        } else {
            contentBody.append("<p style='color: #faad14; font-weight: bold; margin-top: 10px;'>⚠️ Lưu ý: Vẫn còn nợ ").append(formatCurrency(bill.getOutstandingAmount())).append(". Hạn thanh toán đã được gia hạn thêm 30 ngày.</p>");
        }
        contentBody.append("</div>");
        
        // Link xem chi tiết hóa đơn
        contentBody.append("<div style='background-color: #fff7e6; border: 1px solid #ffd591; border-radius: 6px; padding: 20px; margin-bottom: 25px;'>");
        contentBody.append("<h3 style='color: #d46b08; margin: 0 0 15px 0; font-size: 18px;'>Xem chi tiết hóa đơn</h3>");
        contentBody.append("<p style='margin: 0 0 10px 0; color: #d46b08;'>Để xem chi tiết hóa đơn trong hệ thống, vui lòng bấm vào nút bên dưới:</p>");
        contentBody.append("<div style='text-align: center; margin: 15px 0;'>");
        contentBody.append("<a href='http://mpbhms.online/renter/bills/").append(bill.getId()).append("' style='background-color: #1890ff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;'>Xem chi tiết & Thanh toán</a>");
        contentBody.append("</div>");
        contentBody.append("<p style='margin: 10px 0 0 0; color: #d46b08; font-size: 14px;'>Link truy cập: <span style='background-color: #f5f5f5; padding: 4px 8px; border-radius: 4px; font-family: monospace; font-size: 12px;'>http://mpbhms.online/renter/bills/").append(bill.getId()).append("</span></p>");
        contentBody.append("</div>");
        
        return buildStandardEmailTemplate("THANH TOÁN THÀNH CÔNG", "#52c41a", contentBody.toString());
    }

    @Override
    public BillResponse createLatePenaltyBill(Long originalBillId) {
        Bill originalBill = billRepository.findById(originalBillId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy hóa đơn gốc với ID: " + originalBillId));
        
        // KIỂM TRA QUAN TRỌNG: Không cho phép tạo phạt cho hóa đơn phạt
        if (originalBill.getBillType() == BillType.LATE_PENALTY) {
            throw new BusinessException("Không thể tạo phạt cho hóa đơn phạt. Chỉ có thể tạo phạt cho hóa đơn gốc.");
        }
        
        // 🆕 Sửa: Kiểm tra hóa đơn gốc chưa thanh toán (bao gồm cả thanh toán từng phần)
        if (Boolean.TRUE.equals(originalBill.getStatus())) {
            throw new BusinessException("Không thể tạo phạt cho hóa đơn đã thanh toán đầy đủ");
        }
        
        // Kiểm tra xem có còn nợ không (cho thanh toán từng phần)
        BigDecimal outstandingAmount = originalBill.getOutstandingAmount() != null ? 
            originalBill.getOutstandingAmount() : originalBill.getTotalAmount();
        if (outstandingAmount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("Không thể tạo phạt cho hóa đơn đã thanh toán hết");
        }
        
        // Tính toán số ngày quá hạn từ hóa đơn gốc
        int overdueDays = calculateOverdueDays(originalBill);
        if (overdueDays <= 0) {
            throw new BusinessException("Hóa đơn chưa quá hạn");
        }
        
        System.out.println("Tạo phạt cho hóa đơn #" + originalBill.getId() + " - Quá hạn: " + overdueDays + " ngày");
        
        // 🆕 LOGIC MỚI: Xóa hóa đơn phạt cũ nếu có và tạo hóa đơn phạt mới với tỷ lệ cao hơn
        if (billRepository.existsByOriginalBillAndBillType(originalBill, BillType.LATE_PENALTY)) {
            // Tìm và xóa hóa đơn phạt cũ
            List<Bill> existingPenaltyBills = billRepository.findAll().stream()
                .filter(bill -> bill.getOriginalBill() != null && 
                               bill.getOriginalBill().getId().equals(originalBill.getId()) && 
                               bill.getBillType() == BillType.LATE_PENALTY)
                .collect(Collectors.toList());
            
            for (Bill existingPenaltyBill : existingPenaltyBills) {
                System.out.println("Xóa hóa đơn phạt cũ #" + existingPenaltyBill.getId() + " để tạo phạt mới với tỷ lệ cao hơn");
                billRepository.delete(existingPenaltyBill);
            }
        }
        
        // Tính toán phạt với số ngày quá hạn hiện tại
        // 🆕 Sửa: Tính phạt trên outstandingAmount thay vì totalAmount
        BigDecimal amountToCalculatePenalty = originalBill.getOutstandingAmount() != null ? 
            originalBill.getOutstandingAmount() : originalBill.getTotalAmount();
        BigDecimal penaltyAmount = calculateLatePenalty(amountToCalculatePenalty, overdueDays);
        
        System.out.println("Tính phạt cho hóa đơn #" + originalBill.getId() + 
            " - TotalAmount: " + originalBill.getTotalAmount() + 
            " - OutstandingAmount: " + originalBill.getOutstandingAmount() + 
            " - Amount tính phạt: " + amountToCalculatePenalty + 
            " - Phạt: " + penaltyAmount);
        
        // Tạo hóa đơn phạt mới
        Bill penaltyBill = new Bill();
        penaltyBill.setRoom(originalBill.getRoom());
        penaltyBill.setContract(originalBill.getContract());
        penaltyBill.setFromDate(Instant.now()); // Từ ngày hiện tại (ngày tạo phạt)
        penaltyBill.setToDate(originalBill.getToDate()); // Đến ngày hết hạn hóa đơn gốc
        penaltyBill.setPaymentCycle(originalBill.getPaymentCycle());
        penaltyBill.setBillType(BillType.LATE_PENALTY);
        penaltyBill.setBillDate(Instant.now());
        penaltyBill.setTotalAmount(penaltyAmount);
        penaltyBill.setStatus(false);
        penaltyBill.setOriginalBill(originalBill);
        penaltyBill.setPenaltyRate(calculatePenaltyRate(overdueDays));
        
        // QUAN TRỌNG: Set overdueDays từ hóa đơn gốc, không tính lại từ hóa đơn phạt
        penaltyBill.setOverdueDays(overdueDays);
        
        penaltyBill.setPenaltyAmount(penaltyAmount);
        penaltyBill.setNotes("Phạt quá hạn cho hóa đơn #" + originalBill.getId() + " - Quá hạn " + overdueDays + " ngày (Tỷ lệ: " + penaltyBill.getPenaltyRate() + "%) - Tính trên số tiền còn nợ: " + formatCurrency(amountToCalculatePenalty));
        
        // Tạo chi tiết hóa đơn phạt
        List<BillDetail> penaltyDetails = new ArrayList<>();
        BillDetail penaltyDetail = new BillDetail();
        penaltyDetail.setItemType(BillItemType.LATE_PENALTY);
        penaltyDetail.setDescription("Phạt quá hạn hóa đơn #" + originalBill.getId() + " - " + overdueDays + " ngày quá hạn (" + penaltyBill.getPenaltyRate() + "%) - Tính trên số tiền còn nợ: " + formatCurrency(amountToCalculatePenalty));
        penaltyDetail.setItemAmount(penaltyAmount);
        penaltyDetail.setCreatedDate(Instant.now());
        penaltyDetail.setBill(penaltyBill);
        penaltyDetails.add(penaltyDetail);
        
        penaltyBill.setBillDetails(penaltyDetails);
        
        Bill savedPenaltyBill = billRepository.save(penaltyBill);
        
        // 🆕 Xóa hóa đơn gốc khỏi cache cảnh báo khi đã tạo phạt
        warningSentBills.remove(originalBillId);
        System.out.println("[" + java.time.LocalDateTime.now() + "] Đã xóa hóa đơn #" + originalBillId + " khỏi cache cảnh báo (đã tạo phạt)");
        
        // Gửi thông báo
        sendPenaltyNotification(savedPenaltyBill);
        
        return toResponse(savedPenaltyBill);
    }

    @Override
    @Transactional
    public List<BillResponse> checkAndCreateLatePenalties() {
        System.out.println("[" + java.time.LocalDateTime.now() + "] Bắt đầu checkAndCreateLatePenalties()");
        
        List<Bill> overdueBills = getOverdueBills();
        List<BillResponse> createdPenalties = new ArrayList<>();
        
        System.out.println("[" + java.time.LocalDateTime.now() + "] Kiểm tra " + overdueBills.size() + " hóa đơn quá hạn...");
        
        for (Bill overdueBill : overdueBills) {
            try {
                System.out.println("[" + java.time.LocalDateTime.now() + "] Xử lý hóa đơn #" + overdueBill.getId() + 
                    " - Loại: " + overdueBill.getBillType() + " - toDate: " + overdueBill.getToDate());
                
                // KIỂM TRA BỔ SUNG: Đảm bảo không tạo phạt cho hóa đơn phạt
                if (overdueBill.getBillType() == BillType.LATE_PENALTY) {
                    System.out.println("[" + java.time.LocalDateTime.now() + "] Bỏ qua hóa đơn phạt #" + overdueBill.getId() + " - Không tạo phạt chồng phạt");
                    continue;
                }
                
                // 🆕 Kiểm tra xem đã có phạt cho hóa đơn này chưa
                List<Bill> existingPenalties = billRepository.findAll().stream()
                    .filter(bill -> bill.getOriginalBill() != null && 
                                   bill.getOriginalBill().getId().equals(overdueBill.getId()) && 
                                   bill.getBillType() == BillType.LATE_PENALTY)
                    .toList();
                
                if (!existingPenalties.isEmpty()) {
                    System.out.println("[" + java.time.LocalDateTime.now() + "] Hóa đơn #" + overdueBill.getId() + " đã có phạt, bỏ qua");
                    continue;
                }
                
                // 🆕 Tính số ngày quá hạn
                int overdueDays = calculateOverdueDays(overdueBill);
                
                // 🆕 LOGIC MỚI: Chỉ tạo phạt từ ngày thứ 8 trở đi
                if (overdueDays >= 8) {
                    // Từ ngày thứ 8 trở đi: Tạo phạt + gửi thông báo tạo phạt
                    System.out.println("[" + java.time.LocalDateTime.now() + "] Hóa đơn #" + overdueBill.getId() + " quá hạn " + overdueDays + " ngày - TẠO PHẠT + THÔNG BÁO");
                    
                    // Tạo phạt mới
                    BillResponse penaltyBill = createLatePenaltyBill(overdueBill.getId());
                    createdPenalties.add(penaltyBill);
                    System.out.println("[" + java.time.LocalDateTime.now() + "] Đã tạo phạt #" + penaltyBill.getId() + " cho hóa đơn gốc #" + overdueBill.getId() + " (quá hạn " + overdueDays + " ngày)");
                } else {
                    // Dưới 8 ngày: Chưa làm gì (cảnh báo đã được xử lý riêng)
                    System.out.println("[" + java.time.LocalDateTime.now() + "] Hóa đơn #" + overdueBill.getId() + " quá hạn " + overdueDays + " ngày - chưa đủ điều kiện tạo phạt (cần >= 8 ngày)");
                }
                
            } catch (Exception e) {
                System.err.println("[" + java.time.LocalDateTime.now() + "] Lỗi khi xử lý hóa đơn #" + overdueBill.getId() + ": " + e.getMessage());
                e.printStackTrace();
            }
        }
        
        System.out.println("[" + java.time.LocalDateTime.now() + "] Hoàn thành: Đã tạo " + createdPenalties.size() + " hóa đơn phạt mới");
        System.out.println("[" + java.time.LocalDateTime.now() + "] Không có hóa đơn nào cần tạo phạt (cảnh báo đã được xử lý riêng)");
        return createdPenalties;
    }
    
    // Gửi thông báo cảnh báo hóa đơn quá hạn
    @Transactional
    private void sendOverdueWarningNotificationInternal(Bill overdueBill) {
        try {
            // Fetch contract với roomUsers để tránh lazy loading
            Contract contract = contractRepository.findById(overdueBill.getContract().getId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy contract"));
            
            int overdueDays = calculateOverdueDays(overdueBill);
            
            // 1. Gửi thông báo cho người thuê
            if (contract.getRoomUsers() != null) {
                for (RoomUser ru : contract.getRoomUsers()) {
                    if (ru.getUser() != null && Boolean.TRUE.equals(ru.getIsActive())) {
                        // Gửi notification cảnh báo
                        try {
                            NotificationDTO noti = new NotificationDTO();
                            noti.setRecipientId(ru.getUser().getId());
                            noti.setTitle("Cảnh báo hóa đơn quá hạn - Phòng " + contract.getRoom().getRoomNumber());
                            noti.setMessage("Hóa đơn #" + overdueBill.getId() + " đã quá hạn " + overdueDays + " ngày. Số tiền: " + 
                        formatCurrency(overdueBill.getTotalAmount()) + ". Vui lòng thanh toán ngay để tránh bị phạt.");
                            noti.setType(NotificationType.RENT_REMINDER);
                            noti.setMetadata("{\"billId\":" + overdueBill.getId() + ",\"overdueDays\":" + overdueDays + "}");
                            notificationService.createAndSend(noti);
                        } catch (Exception e) {
                            System.err.println("Lỗi gửi notification cảnh báo cho user " + ru.getUser().getId() + ": " + e.getMessage());
                        }
                        
                        // Gửi email cảnh báo
                        if (ru.getUser().getEmail() != null) {
                            try {
                                String subject = "CẢNH BÁO HÓA ĐƠN QUÁ HẠN - Phòng " + contract.getRoom().getRoomNumber();
                                String content = buildOverdueWarningEmailContent(overdueBill, overdueDays);
                                
                                // Tạo PDF hóa đơn gốc
                                byte[] pdfBytes = generateBillPdf(overdueBill.getId());
                                
                                emailService.sendBillWithAttachment(
                                    ru.getUser().getEmail(), 
                                    subject, 
                                    content, 
                                    pdfBytes
                                );
                                
                                System.out.println("Đã gửi email cảnh báo quá hạn cho " + ru.getUser().getEmail());
                            } catch (Exception e) {
                                System.err.println("Lỗi gửi email cảnh báo cho " + ru.getUser().getEmail() + ": " + e.getMessage());
                            }
                        }
                    }
                }
            }
            
            // 2. 🆕 Gửi thông báo cho landlord
            sendLandlordOverdueNotification(overdueBill, overdueDays);
            
        } catch (Exception e) {
            System.err.println("Lỗi trong sendOverdueWarningNotificationInternal: " + e.getMessage());
            e.printStackTrace();
        }
    }
    
    // Gửi thông báo cho landlord về hóa đơn quá hạn
    private void sendLandlordOverdueNotification(Bill overdueBill, int overdueDays) {
        try {
            User landlord = overdueBill.getRoom().getLandlord();
            if (landlord != null) {
                // Gửi notification cho landlord
                NotificationDTO landlordNoti = new NotificationDTO();
                landlordNoti.setRecipientId(landlord.getId());
                landlordNoti.setTitle("Thông báo hóa đơn quá hạn - Phòng " + overdueBill.getRoom().getRoomNumber());
                landlordNoti.setMessage("Hóa đơn #" + overdueBill.getId() + " của phòng " + overdueBill.getRoom().getRoomNumber() + 
                    " đã quá hạn " + overdueDays + " ngày. Số tiền: " + formatCurrency(overdueBill.getTotalAmount()) + ". " +
                    "Hệ thống sẽ tự động tạo phạt nếu không thanh toán.");
                landlordNoti.setType(NotificationType.RENT_REMINDER);
                landlordNoti.setMetadata("{\"billId\":" + overdueBill.getId() + ",\"roomNumber\":\"" + overdueBill.getRoom().getRoomNumber() + "\",\"overdueDays\":" + overdueDays + "}");
                notificationService.createAndSend(landlordNoti);
                
                System.out.println("Đã gửi notification cảnh báo quá hạn cho landlord " + landlord.getUsername());
                
                // Gửi email cho landlord
                if (landlord.getEmail() != null) {
                    try {
                        String subject = "THÔNG BÁO HÓA ĐƠN QUÁ HẠN - Phòng " + overdueBill.getRoom().getRoomNumber();
                        String content = buildLandlordOverdueEmailContent(overdueBill, overdueDays);
                        
                        emailService.sendBillWithAttachment(
                            landlord.getEmail(), 
                            subject, 
                            content, 
                            null // Không đính kèm PDF cho landlord
                        );
                        
                        System.out.println("Đã gửi email cảnh báo quá hạn cho landlord " + landlord.getEmail());
                    } catch (Exception e) {
                        System.err.println("Lỗi gửi email cảnh báo cho landlord " + landlord.getEmail() + ": " + e.getMessage());
                    }
                }
            }
        } catch (Exception e) {
            System.err.println("Lỗi gửi thông báo cho landlord: " + e.getMessage());
        }
    }
    
    // Tạo nội dung email cảnh báo quá hạn
    private String buildOverdueWarningEmailContent(Bill overdueBill, int overdueDays) {
        StringBuilder content = new StringBuilder();
        content.append("<div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;'>");
        content.append("<div style='background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);'>");
        
        // Header
        content.append("<div style='text-align: center; margin-bottom: 30px;'>");
        content.append("<h1 style='color: #faad14; margin: 0; font-size: 24px;'>CẢNH BÁO HÓA ĐƠN QUÁ HẠN</h1>");
        content.append("<div style='width: 60px; height: 3px; background-color: #faad14; margin: 10px auto;'></div>");
        content.append("</div>");
        
        // Thông tin hóa đơn
        content.append("<div style='background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 6px; padding: 20px; margin-bottom: 25px;'>");
        content.append("<h3 style='color: #856404; margin: 0 0 15px 0; font-size: 18px;'>Thông tin hóa đơn</h3>");
        content.append("<table style='width: 100%; border-collapse: collapse;'>");
        content.append("<tr><td style='padding: 8px 0; font-weight: bold; color: #333;'>Phòng:</td><td style='padding: 8px 0; color: #666;'>").append(overdueBill.getRoom().getRoomNumber()).append("</td></tr>");
        content.append("<tr><td style='padding: 8px 0; font-weight: bold; color: #333;'>Mã hóa đơn:</td><td style='padding: 8px 0; color: #666;'>#").append(overdueBill.getId()).append("</td></tr>");
        content.append("<tr><td style='padding: 8px 0; font-weight: bold; color: #333;'>Số ngày quá hạn:</td><td style='padding: 8px 0; color: #faad14; font-weight: bold;'>").append(overdueDays).append(" ngày</td></tr>");
        content.append("<tr><td style='padding: 8px 0; font-weight: bold; color: #333;'>Số tiền cần thanh toán:</td><td style='padding: 8px 0; color: #faad14; font-weight: bold; font-size: 16px;'>").append(formatCurrency(overdueBill.getTotalAmount())).append("</td></tr>");
        content.append("</table>");
        content.append("</div>");
        
        // Cảnh báo
        content.append("<div style='background-color: #f8d7da; border: 1px solid #f5c6cb; border-radius: 6px; padding: 20px; margin-bottom: 25px;'>");
        content.append("<h3 style='color: #721c24; margin: 0 0 15px 0; font-size: 18px;'>Cảnh báo quan trọng</h3>");
        content.append("<ul style='margin: 0; padding-left: 20px; color: #721c24;'>");
        content.append("<li style='margin-bottom: 8px;'>Hóa đơn đã quá hạn <strong>").append(overdueDays).append(" ngày</strong></li>");
        content.append("<li style='margin-bottom: 8px;'>Nếu không thanh toán ngay, sẽ bị tính phạt theo quy định</li>");
        content.append("<li style='margin-bottom: 8px;'>Phạt sẽ tăng dần: Tuần 1 (1%) → Tuần 2 (2%) → Tuần 3 (3%) → Tuần 4 (4%) → Từ tuần 5 (5%)</li>");
        content.append("</ul>");
        content.append("</div>");
        
        // Khuyến nghị
        content.append("<div style='background-color: #d1ecf1; border: 1px solid #bee5eb; border-radius: 6px; padding: 20px; margin-bottom: 25px;'>");
        content.append("<h3 style='color: #0c5460; margin: 0 0 15px 0; font-size: 18px;'>Khuyến nghị</h3>");
        content.append("<p style='margin: 0; color: #0c5460; font-weight: bold;'>Thanh toán ngay để tránh phạt tăng thêm!</p>");
        content.append("</div>");
        
        // Link xem chi tiết hóa đơn
        content.append("<div style='background-color: #fff7e6; border: 1px solid #ffd591; border-radius: 6px; padding: 20px; margin-bottom: 25px;'>");
        content.append("<h3 style='color: #d46b08; margin: 0 0 15px 0; font-size: 18px;'>Xem chi tiết hóa đơn</h3>");
        content.append("<p style='margin: 0 0 10px 0; color: #d46b08;'>Để xem chi tiết hóa đơn trong hệ thống, vui lòng bấm vào nút bên dưới:</p>");
        content.append("<div style='text-align: center; margin: 15px 0;'>");
        content.append("<a href='http://mpbhms.online/renter/bills/").append(overdueBill.getId()).append("' style='background-color: #1890ff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;'>Xem chi tiết & Thanh toán</a>");
        content.append("</div>");
        content.append("<p style='margin: 10px 0 0 0; color: #d46b08; font-size: 14px;'>Link truy cập: <span style='background-color: #f5f5f5; padding: 4px 8px; border-radius: 4px; font-family: monospace; font-size: 12px;'>http://mpbhms.online/renter/bills/").append(overdueBill.getId()).append("</span></p>");
        content.append("</div>");
        
        // Footer
        content.append("<div style='text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6;'>");
        content.append("<p style='margin: 0; color: #6c757d; font-size: 14px;'>Trân trọng,<br><strong>Ban quản lý tòa nhà</strong></p>");
        content.append("</div>");
        
        content.append("</div>");
        content.append("</div>");
        
        return content.toString();
    }
    
    // Tạo nội dung email cảnh báo quá hạn cho landlord
    private String buildLandlordOverdueEmailContent(Bill overdueBill, int overdueDays) {
        StringBuilder content = new StringBuilder();
        content.append("<div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;'>");
        content.append("<div style='background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);'>");
        
        // Header
        content.append("<div style='text-align: center; margin-bottom: 30px;'>");
        content.append("<h1 style='color: #faad14; margin: 0; font-size: 24px;'>THÔNG BÁO HÓA ĐƠN QUÁ HẠN</h1>");
        content.append("<div style='width: 60px; height: 3px; background-color: #faad14; margin: 10px auto;'></div>");
        content.append("</div>");
        
        // Thông tin hóa đơn
        content.append("<div style='background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 6px; padding: 20px; margin-bottom: 25px;'>");
        content.append("<h3 style='color: #856404; margin: 0 0 15px 0; font-size: 18px;'>Thông tin hóa đơn</h3>");
        content.append("<table style='width: 100%; border-collapse: collapse;'>");
        content.append("<tr><td style='padding: 8px 0; font-weight: bold; color: #333;'>Phòng:</td><td style='padding: 8px 0; color: #666;'>").append(overdueBill.getRoom().getRoomNumber()).append("</td></tr>");
        content.append("<tr><td style='padding: 8px 0; font-weight: bold; color: #333;'>Mã hóa đơn:</td><td style='padding: 8px 0; color: #666;'>#").append(overdueBill.getId()).append("</td></tr>");
        content.append("<tr><td style='padding: 8px 0; font-weight: bold; color: #333;'>Số ngày quá hạn:</td><td style='padding: 8px 0; color: #faad14; font-weight: bold;'>").append(overdueDays).append(" ngày</td></tr>");
        content.append("<tr><td style='padding: 8px 0; font-weight: bold; color: #333;'>Số tiền:</td><td style='padding: 8px 0; color: #faad14; font-weight: bold; font-size: 16px;'>").append(formatCurrency(overdueBill.getTotalAmount())).append("</td></tr>");
        content.append("</table>");
        content.append("</div>");
        
        // Thông tin hệ thống
        content.append("<div style='background-color: #d1ecf1; border: 1px solid #bee5eb; border-radius: 6px; padding: 20px; margin-bottom: 25px;'>");
        content.append("<h3 style='color: #0c5460; margin: 0 0 15px 0; font-size: 18px;'>Thông tin hệ thống</h3>");
        content.append("<ul style='margin: 0; padding-left: 20px; color: #0c5460;'>");
        content.append("<li style='margin-bottom: 8px;'>Hóa đơn đã quá hạn <strong>").append(overdueDays).append(" ngày</strong></li>");
        content.append("<li style='margin-bottom: 8px;'>Hệ thống đã gửi cảnh báo cho người thuê</li>");
        content.append("<li style='margin-bottom: 8px;'>Nếu không thanh toán, hệ thống sẽ tự động tạo phạt</li>");
        content.append("</ul>");
        content.append("</div>");
        
        // Hành động
        content.append("<div style='background-color: #d4edda; border: 1px solid #c3e6cb; border-radius: 6px; padding: 20px; margin-bottom: 25px;'>");
        content.append("<h3 style='color: #155724; margin: 0 0 15px 0; font-size: 18px;'>Hành động</h3>");
        content.append("<p style='margin: 0; color: #155724; font-weight: bold;'>Bạn có thể liên hệ người thuê để nhắc nhở thanh toán</p>");
        content.append("</div>");
        
        // Footer
        content.append("<div style='text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6;'>");
        content.append("<p style='margin: 0; color: #6c757d; font-size: 14px;'>Trân trọng,<br><strong>Ban quản lý tòa nhà</strong></p>");
        content.append("</div>");
        
        content.append("</div>");
        content.append("</div>");
        
        return content.toString();
    }
    
    // Tạo nội dung email phạt cho landlord
    private String buildLandlordPenaltyEmailContent(Bill penaltyBill, Bill originalBill) {
        StringBuilder content = new StringBuilder();
        content.append("<div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;'>");
        content.append("<div style='background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);'>");
        
        // Header
        content.append("<div style='text-align: center; margin-bottom: 30px;'>");
        content.append("<h1 style='color: #ff4d4f; margin: 0; font-size: 24px;'>THÔNG BÁO HÓA ĐƠN PHẠT</h1>");
        content.append("<div style='width: 60px; height: 3px; background-color: #ff4d4f; margin: 10px auto;'></div>");
        content.append("</div>");
        
        // Thông tin hóa đơn
        content.append("<div style='background-color: #f8d7da; border: 1px solid #f5c6cb; border-radius: 6px; padding: 20px; margin-bottom: 25px;'>");
        content.append("<h3 style='color: #721c24; margin: 0 0 15px 0; font-size: 18px;'>Thông tin hóa đơn phạt</h3>");
        content.append("<table style='width: 100%; border-collapse: collapse;'>");
        content.append("<tr><td style='padding: 8px 0; font-weight: bold; color: #333;'>Phòng:</td><td style='padding: 8px 0; color: #666;'>").append(penaltyBill.getRoom().getRoomNumber()).append("</td></tr>");
        content.append("<tr><td style='padding: 8px 0; font-weight: bold; color: #333;'>Hóa đơn gốc:</td><td style='padding: 8px 0; color: #666;'>#").append(originalBill.getId()).append("</td></tr>");
        content.append("<tr><td style='padding: 8px 0; font-weight: bold; color: #333;'>Hóa đơn phạt:</td><td style='padding: 8px 0; color: #666;'>#").append(penaltyBill.getId()).append("</td></tr>");
        content.append("<tr><td style='padding: 8px 0; font-weight: bold; color: #333;'>Số ngày quá hạn:</td><td style='padding: 8px 0; color: #ff4d4f; font-weight: bold;'>").append(penaltyBill.getOverdueDays()).append(" ngày</td></tr>");
        content.append("<tr><td style='padding: 8px 0; font-weight: bold; color: #333;'>Tỷ lệ phạt:</td><td style='padding: 8px 0; color: #ff4d4f; font-weight: bold;'>").append(penaltyBill.getPenaltyRate()).append("%</td></tr>");
        content.append("<tr><td style='padding: 8px 0; font-weight: bold; color: #333;'>Số tiền phạt:</td><td style='padding: 8px 0; color: #ff4d4f; font-weight: bold; font-size: 16px;'>").append(formatCurrency(penaltyBill.getPenaltyAmount())).append("</td></tr>");
        content.append("<tr><td style='padding: 8px 0; font-weight: bold; color: #333;'>Tổng cộng cần thanh toán:</td><td style='padding: 8px 0; color: #ff4d4f; font-weight: bold; font-size: 16px;'>").append(formatCurrency(originalBill.getTotalAmount().add(penaltyBill.getPenaltyAmount()))).append("</td></tr>");
        content.append("</table>");
        content.append("</div>");
        
        // Thông tin hệ thống
        content.append("<div style='background-color: #d1ecf1; border: 1px solid #bee5eb; border-radius: 6px; padding: 20px; margin-bottom: 25px;'>");
        content.append("<h3 style='color: #0c5460; margin: 0 0 15px 0; font-size: 18px;'>Thông tin hệ thống</h3>");
        content.append("<ul style='margin: 0; padding-left: 20px; color: #0c5460;'>");
        content.append("<li style='margin-bottom: 8px;'>Hệ thống đã tự động tạo hóa đơn phạt</li>");
        content.append("<li style='margin-bottom: 8px;'>Người thuê đã được thông báo về hóa đơn phạt</li>");
        content.append("<li style='margin-bottom: 8px;'>Phạt sẽ tăng dần nếu không thanh toán</li>");
        content.append("</ul>");
        content.append("</div>");
        
        // Hành động
        content.append("<div style='background-color: #d4edda; border: 1px solid #c3e6cb; border-radius: 6px; padding: 20px; margin-bottom: 25px;'>");
        content.append("<h3 style='color: #155724; margin: 0 0 15px 0; font-size: 18px;'>Hành động</h3>");
        content.append("<p style='margin: 0; color: #155724; font-weight: bold;'>Bạn có thể theo dõi tình trạng thanh toán trong hệ thống</p>");
        content.append("</div>");
        
        // Link xem chi tiết hóa đơn
        content.append("<div style='background-color: #fff7e6; border: 1px solid #ffd591; border-radius: 6px; padding: 20px; margin-bottom: 25px;'>");
        content.append("<h3 style='color: #d46b08; margin: 0 0 15px 0; font-size: 18px;'>Xem chi tiết hóa đơn</h3>");
        content.append("<p style='margin: 0 0 10px 0; color: #d46b08;'>Để xem chi tiết hóa đơn trong hệ thống, vui lòng bấm vào nút bên dưới:</p>");
        content.append("<div style='text-align: center; margin: 15px 0;'>");
        content.append("<a href='http://mpbhms.online/landlord/bills/").append(penaltyBill.getId()).append("' style='background-color: #1890ff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;'>Xem chi tiết hóa đơn</a>");
        content.append("</div>");
        content.append("<p style='margin: 10px 0 0 0; color: #d46b08; font-size: 14px;'>Link truy cập: <span style='background-color: #f5f5f5; padding: 4px 8px; border-radius: 4px; font-family: monospace; font-size: 12px;'>http://mpbhms.online/landlord/bills/").append(penaltyBill.getId()).append("</span></p>");
        content.append("</div>");
        
        // Footer
        content.append("<div style='text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6;'>");
        content.append("<p style='margin: 0; color: #6c757d; font-size: 14px;'>Trân trọng,<br><strong>Hệ thống quản lý tòa nhà</strong></p>");
        content.append("</div>");
        
        content.append("</div>");
        content.append("</div>");
        
        return content.toString();
    }

    @Override
    public BigDecimal calculateLatePenalty(BigDecimal originalAmount, int overdueDays) {
        BigDecimal penaltyRate = calculatePenaltyRate(overdueDays);
        // Tính phạt và làm tròn xuống để lấy phần nguyên, tránh lỗi parsing
        BigDecimal penaltyAmount = originalAmount.multiply(penaltyRate).divide(BigDecimal.valueOf(100), 2, BigDecimal.ROUND_HALF_UP);
        return penaltyAmount.setScale(0, BigDecimal.ROUND_DOWN);
    }

    @Override
    public List<Bill> getOverdueBills() {
        Instant now = Instant.now();
        
        // 🆕 Logic mới: Lấy tất cả hóa đơn chưa thanh toán và kiểm tra từng cái
        // vì hóa đơn thanh toán từng phần có dueDate được gia hạn
        List<Bill> allUnpaidBills = billRepository.findByStatusFalse();
        List<Bill> overdueBills = new ArrayList<>();
        
        System.out.println("🆕 Tìm hóa đơn quá hạn - Thời gian hiện tại: " + now);
        System.out.println("Tổng số hóa đơn chưa thanh toán: " + allUnpaidBills.size());
        
        for (Bill bill : allUnpaidBills) {
            int overdueDays = calculateOverdueDays(bill);
            
            // Chỉ coi là quá hạn nếu overdueDays > 0 (sau khi đã áp dụng logic 37 ngày cho thanh toán từng phần)
            if (overdueDays > 0) {
                overdueBills.add(bill);
                
                Instant dueDate = bill.getDueDate() != null ? bill.getDueDate() : 
                    bill.getToDate().plusSeconds(7 * 24 * 60 * 60);
                
                System.out.println("  - Hóa đơn #" + bill.getId() + 
                    " - DueDate: " + dueDate + 
                    " - Thanh toán từng phần: " + (Boolean.TRUE.equals(bill.getIsPartiallyPaid()) ? "Có" : "Không") +
                    " - Quá hạn: " + overdueDays + " ngày");
            }
        }
        
        System.out.println("Tìm thấy " + overdueBills.size() + " hóa đơn quá hạn (sau khi áp dụng logic mới)");
        
        return overdueBills;
    }

    @Override
    public List<Bill> getAllPenaltyBills() {
        return billRepository.findAll().stream()
            .filter(bill -> bill.getBillType() == BillType.LATE_PENALTY)
            .toList();
    }

    @Override
    public int calculateOverdueDays(Bill bill) {
        Instant dueDate;
        
        // Nếu có dueDate được set cụ thể, sử dụng dueDate
        if (bill.getDueDate() != null) {
            dueDate = bill.getDueDate();
        } else {
            // Nếu không có dueDate, tính toán: toDate + 7 ngày
            dueDate = bill.getToDate().plusSeconds(7 * 24 * 60 * 60); // toDate + 7 days
        }
        
        Instant now = Instant.now();
        
        if (now.isBefore(dueDate)) {
            return 0;
        }
        
        long daysDiff = java.time.Duration.between(dueDate, now).toDays();
        int overdueDays = (int) daysDiff;
        
        // 🆕 Logic mới: Đối với hóa đơn thanh toán từng phần, trừ đi 7 ngày trước khi tính phạt
        // (thay vì 37 ngày như trước)
        if (Boolean.TRUE.equals(bill.getIsPartiallyPaid())) {
            overdueDays = Math.max(0, overdueDays - 7); // Trừ 7 ngày, tối thiểu là 0
            System.out.println("🆕 Hóa đơn #" + bill.getId() + " đã thanh toán từng phần - Ngày quá hạn thực tế: " + 
                (int) daysDiff + " - Sau khi trừ 7 ngày: " + overdueDays);
        }
        
        return overdueDays;
    }

    // Tính toán tỷ lệ phạt dựa trên số ngày quá hạn
    private BigDecimal calculatePenaltyRate(int overdueDays) {
        // 🆕 Logic phạt mới (giảm xuống tối đa 5%): 
        // - Tuần đầu tiên (1-7 ngày): 1% 
        // - Tuần thứ 2 (8-14 ngày): 2%
        // - Tuần thứ 3 (15-21 ngày): 3%
        // - Tuần thứ 4 (22-28 ngày): 4%
        // - Từ tuần thứ 5 trở đi: 5%
        
        if (overdueDays <= 0) {
            return BigDecimal.ZERO;
        }
        
        int weeks = (overdueDays - 1) / 7 + 1; // Làm tròn lên
        
        BigDecimal penaltyRate;
        switch (weeks) {
            case 1:
                penaltyRate = BigDecimal.valueOf(1); // 1%
                break;
            case 2:
                penaltyRate = BigDecimal.valueOf(2); // 2%
                break;
            case 3:
                penaltyRate = BigDecimal.valueOf(3); // 3%
                break;
            case 4:
                penaltyRate = BigDecimal.valueOf(4); // 4%
                break;
            default:
                penaltyRate = BigDecimal.valueOf(5); // 5% cho tuần thứ 5 trở đi (tối đa)
                break;
        }
        
        return penaltyRate;
    }

    // Helper method để format số tiền VNĐ (chuẩn hóa) - chỉ lấy phần nguyên
    private String formatCurrency(BigDecimal amount) {
        if (amount == null) return "0 VNĐ";
        // Làm tròn xuống để lấy phần nguyên
        BigDecimal roundedAmount = amount.setScale(0, BigDecimal.ROUND_DOWN);
        return new java.text.DecimalFormat("#,###").format(roundedAmount) + " VNĐ";
    }

    // Helper method để format số tiền VNĐ không có dấu phẩy (cho thông báo)
    private String formatCurrencyPlain(BigDecimal amount) {
        if (amount == null) return "0 VNĐ";
        return amount.toString() + " VNĐ";
    }

    // 🆕 Tạo email template chuẩn cho tất cả loại email
    private String buildStandardEmailTemplate(String title, String headerColor, String content) {
        StringBuilder email = new StringBuilder();
        email.append("<div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;'>");
        email.append("<div style='background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);'>");
        
        // Header
        email.append("<div style='text-align: center; margin-bottom: 30px;'>");
        email.append("<h1 style='color: ").append(headerColor).append("; margin: 0; font-size: 24px;'>").append(title).append("</h1>");
        email.append("<div style='width: 60px; height: 3px; background-color: ").append(headerColor).append("; margin: 10px auto;'></div>");
        email.append("</div>");
        
        // Content
        email.append(content);
        
        // Footer
        email.append("<div style='text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6;'>");
        email.append("<p style='margin: 0; color: #6c757d; font-size: 14px;'>Trân trọng,<br><strong>Ban quản lý tòa nhà MP-BHMS</strong></p>");
        email.append("</div>");
        
        email.append("</div>");
        email.append("</div>");
        
        return email.toString();
    }

    // Gửi thông báo và email phạt
    @Override
    @Transactional
    public void sendPenaltyNotification(Bill penaltyBill) {
        try {
            // Fetch contract với roomUsers để tránh lazy loading
            Contract contract = contractRepository.findById(penaltyBill.getContract().getId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy contract"));
            
            Bill originalBill = penaltyBill.getOriginalBill();
            
            // 1. Gửi thông báo cho người thuê
        if (contract.getRoomUsers() != null) {
            for (RoomUser ru : contract.getRoomUsers()) {
                if (ru.getUser() != null && Boolean.TRUE.equals(ru.getIsActive())) {
                        // Gửi notification trong hệ thống
                        try {
                    NotificationDTO noti = new NotificationDTO();
                    noti.setRecipientId(ru.getUser().getId());
                            noti.setTitle("Hóa đơn phạt quá hạn - Phòng " + contract.getRoom().getRoomNumber());
                    noti.setMessage("Bạn có hóa đơn phạt #" + penaltyBill.getId() + " cho hóa đơn #" + 
                                originalBill.getId() + " - Số tiền phạt: " + 
                                formatCurrency(penaltyBill.getPenaltyAmount()) + " (" + penaltyBill.getPenaltyRate() + "%). Vui lòng thanh toán sớm để tránh phạt tăng thêm.");
                    noti.setType(NotificationType.RENT_REMINDER);
                            noti.setMetadata("{\"billId\":" + penaltyBill.getId() + ",\"originalBillId\":" + originalBill.getId() + ",\"penaltyAmount\":" + penaltyBill.getPenaltyAmount().setScale(0, BigDecimal.ROUND_DOWN) + "}");
                    notificationService.createAndSend(noti);
                        } catch (Exception e) {
                            System.err.println("Lỗi gửi notification phạt cho user " + ru.getUser().getId() + ": " + e.getMessage());
                        }
                        
                        // Gửi email phạt
                        if (ru.getUser().getEmail() != null) {
                            try {
                                String subject = "HÓA ĐƠN PHẠT QUÁ HẠN - Phòng " + contract.getRoom().getRoomNumber();
                                String content = buildPenaltyEmailContent(penaltyBill, originalBill);
                                
                                // Tạo PDF hóa đơn phạt
                                byte[] pdfBytes = generateBillPdf(penaltyBill.getId());
                                
                                emailService.sendBillWithAttachment(
                                    ru.getUser().getEmail(), 
                                    subject, 
                                    content, 
                                    pdfBytes
                                );
                                
                                System.out.println("Đã gửi email phạt cho " + ru.getUser().getEmail());
                            } catch (Exception e) {
                                System.err.println("Lỗi gửi email phạt cho " + ru.getUser().getEmail() + ": " + e.getMessage());
                            }
                        }
                    }
                }
            }
            
            // 2. 🆕 Gửi thông báo cho landlord
            sendLandlordPenaltyNotification(penaltyBill, originalBill);
            
        } catch (Exception e) {
            System.err.println("Lỗi trong sendPenaltyNotification: " + e.getMessage());
            e.printStackTrace();
        }
    }
    
    // 🆕 Gửi thông báo và email phạt với logging (cho manual trigger)
    @Override
    @Transactional
    public void sendPenaltyNotificationWithLogging(Bill penaltyBill, String clientIp, String userAgent, Long sentByUserId) {
        try {
            // Fetch contract với roomUsers để tránh lazy loading
            Contract contract = contractRepository.findById(penaltyBill.getContract().getId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy contract"));
            
            Bill originalBill = penaltyBill.getOriginalBill();
            
            // 1. Gửi thông báo cho người thuê
        if (contract.getRoomUsers() != null) {
            for (RoomUser ru : contract.getRoomUsers()) {
                if (ru.getUser() != null && Boolean.TRUE.equals(ru.getIsActive())) {
                        // Gửi notification trong hệ thống
                        try {
                    NotificationDTO noti = new NotificationDTO();
                    noti.setRecipientId(ru.getUser().getId());
                            noti.setTitle("Hóa đơn phạt quá hạn - Phòng " + contract.getRoom().getRoomNumber());
                    noti.setMessage("Bạn có hóa đơn phạt #" + penaltyBill.getId() + " cho hóa đơn #" + 
                                originalBill.getId() + " - Số tiền phạt: " + 
                                formatCurrency(penaltyBill.getPenaltyAmount()) + " (" + penaltyBill.getPenaltyRate() + "%). Vui lòng thanh toán sớm để tránh phạt tăng thêm.");
                    noti.setType(NotificationType.RENT_REMINDER);
                            noti.setMetadata("{\"billId\":" + penaltyBill.getId() + ",\"originalBillId\":" + originalBill.getId() + ",\"penaltyAmount\":" + penaltyBill.getPenaltyAmount().setScale(0, BigDecimal.ROUND_DOWN) + "}");
                    notificationService.createAndSend(noti);
                        } catch (Exception e) {
                            System.err.println("Lỗi gửi notification phạt cho user " + ru.getUser().getId() + ": " + e.getMessage());
                        }
                        
                        // Gửi email phạt
                        if (ru.getUser().getEmail() != null) {
                            try {
                                String subject = "HÓA ĐƠN PHẠT QUÁ HẠN - Phòng " + contract.getRoom().getRoomNumber();
                                String content = buildPenaltyEmailContent(penaltyBill, originalBill);
                                
                                // Tạo PDF hóa đơn phạt
                                byte[] pdfBytes = generateBillPdf(penaltyBill.getId());
                                
                                emailService.sendBillWithAttachment(
                                    ru.getUser().getEmail(), 
                                    subject, 
                                    content, 
                                    pdfBytes
                                );
                                
                                // 🆕 Lưu log email đã gửi (giống như API gửi email bình thường)
                                logEmailSent(penaltyBill.getId(), ru.getUser().getEmail(), "PENALTY", clientIp, userAgent, sentByUserId);
                                
                                System.out.println("Đã gửi email phạt cho " + ru.getUser().getEmail());
                            } catch (Exception e) {
                                System.err.println("Lỗi gửi email phạt cho " + ru.getUser().getEmail() + ": " + e.getMessage());
                            }
                        }
                    }
                }
            }
            
            // 2. 🆕 Gửi thông báo cho landlord
            sendLandlordPenaltyNotification(penaltyBill, originalBill);
            
        } catch (Exception e) {
            System.err.println("Lỗi trong sendPenaltyNotificationWithLogging: " + e.getMessage());
            e.printStackTrace();
        }
    }
    
    // Gửi thông báo cho landlord về hóa đơn phạt
    private void sendLandlordPenaltyNotification(Bill penaltyBill, Bill originalBill) {
        try {
            User landlord = penaltyBill.getRoom().getLandlord();
            if (landlord != null) {
                // Gửi notification cho landlord
                NotificationDTO landlordNoti = new NotificationDTO();
                landlordNoti.setRecipientId(landlord.getId());
                landlordNoti.setTitle("Thông báo hóa đơn phạt - Phòng " + penaltyBill.getRoom().getRoomNumber());
                landlordNoti.setMessage("Đã tạo hóa đơn phạt #" + penaltyBill.getId() + " cho hóa đơn #" + originalBill.getId() + 
                    " của phòng " + penaltyBill.getRoom().getRoomNumber() + ". Số tiền phạt: " + 
                    formatCurrency(penaltyBill.getPenaltyAmount()) + " (" + penaltyBill.getPenaltyRate() + "%).");
                landlordNoti.setType(NotificationType.RENT_REMINDER);
                landlordNoti.setMetadata("{\"billId\":" + penaltyBill.getId() + ",\"originalBillId\":" + originalBill.getId() + ",\"roomNumber\":\"" + penaltyBill.getRoom().getRoomNumber() + "\",\"penaltyAmount\":" + penaltyBill.getPenaltyAmount().setScale(0, BigDecimal.ROUND_DOWN) + "}");
                notificationService.createAndSend(landlordNoti);
                
                System.out.println("Đã gửi notification phạt cho landlord " + landlord.getUsername());
                
                // Gửi email cho landlord
                if (landlord.getEmail() != null) {
                    try {
                        String subject = "THÔNG BÁO HÓA ĐƠN PHẠT - Phòng " + penaltyBill.getRoom().getRoomNumber();
                        String content = buildLandlordPenaltyEmailContent(penaltyBill, originalBill);
                        
                        emailService.sendBillWithAttachment(
                            landlord.getEmail(), 
                            subject, 
                            content, 
                            null // Không đính kèm PDF cho landlord
                        );
                        
                        System.out.println("Đã gửi email phạt cho landlord " + landlord.getEmail());
                    } catch (Exception e) {
                        System.err.println("Lỗi gửi email phạt cho landlord " + landlord.getEmail() + ": " + e.getMessage());
                    }
                }
            }
        } catch (Exception e) {
            System.err.println("Lỗi gửi thông báo phạt cho landlord: " + e.getMessage());
        }
    }
    
    // Tạo nội dung email phạt
    private String buildPenaltyEmailContent(Bill penaltyBill, Bill originalBill) {
        StringBuilder content = new StringBuilder();
        content.append("<div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;'>");
        content.append("<div style='background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);'>");
        
        // Header
        content.append("<div style='text-align: center; margin-bottom: 30px;'>");
        content.append("<h1 style='color: #ff4d4f; margin: 0; font-size: 24px;'>HÓA ĐƠN PHẠT QUÁ HẠN</h1>");
        content.append("<div style='width: 60px; height: 3px; background-color: #ff4d4f; margin: 10px auto;'></div>");
        content.append("</div>");
        
        // Thông tin hóa đơn
        content.append("<div style='background-color: #f8d7da; border: 1px solid #f5c6cb; border-radius: 6px; padding: 20px; margin-bottom: 25px;'>");
        content.append("<h3 style='color: #721c24; margin: 0 0 15px 0; font-size: 18px;'>Thông tin hóa đơn phạt</h3>");
        content.append("<table style='width: 100%; border-collapse: collapse;'>");
        content.append("<tr><td style='padding: 8px 0; font-weight: bold; color: #333;'>Phòng:</td><td style='padding: 8px 0; color: #666;'>").append(penaltyBill.getRoom().getRoomNumber()).append("</td></tr>");
        content.append("<tr><td style='padding: 8px 0; font-weight: bold; color: #333;'>Hóa đơn gốc:</td><td style='padding: 8px 0; color: #666;'>#").append(originalBill.getId()).append("</td></tr>");
        content.append("<tr><td style='padding: 8px 0; font-weight: bold; color: #333;'>Hóa đơn phạt:</td><td style='padding: 8px 0; color: #666;'>#").append(penaltyBill.getId()).append("</td></tr>");
        content.append("<tr><td style='padding: 8px 0; font-weight: bold; color: #333;'>Số ngày quá hạn:</td><td style='padding: 8px 0; color: #ff4d4f; font-weight: bold;'>").append(penaltyBill.getOverdueDays()).append(" ngày</td></tr>");
        content.append("<tr><td style='padding: 8px 0; font-weight: bold; color: #333;'>Tỷ lệ phạt:</td><td style='padding: 8px 0; color: #ff4d4f; font-weight: bold;'>").append(penaltyBill.getPenaltyRate()).append("%</td></tr>");
        content.append("<tr><td style='padding: 8px 0; font-weight: bold; color: #333;'>Số tiền phạt:</td><td style='padding: 8px 0; color: #ff4d4f; font-weight: bold; font-size: 16px;'>").append(formatCurrency(penaltyBill.getPenaltyAmount())).append("</td></tr>");
        content.append("<tr><td style='padding: 8px 0; font-weight: bold; color: #333;'>Tổng cộng cần thanh toán:</td><td style='padding: 8px 0; color: #ff4d4f; font-weight: bold; font-size: 16px;'>").append(formatCurrency(originalBill.getTotalAmount().add(penaltyBill.getPenaltyAmount()))).append("</td></tr>");
        content.append("</table>");
        content.append("</div>");
        
        // Lưu ý quan trọng
        content.append("<div style='background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 6px; padding: 20px; margin-bottom: 25px;'>");
        content.append("<h3 style='color: #856404; margin: 0 0 15px 0; font-size: 18px;'>Lưu ý quan trọng</h3>");
        content.append("<ul style='margin: 0; padding-left: 20px; color: #856404;'>");
        content.append("<li style='margin-bottom: 8px;'>Phạt sẽ tăng dần theo thời gian quá hạn</li>");
        content.append("<li style='margin-bottom: 8px;'>Tuần 1: 1% | Tuần 2: 2% | Tuần 3: 3% | Tuần 4: 4% | Từ tuần 5: 5%</li>");
        content.append("<li style='margin-bottom: 8px;'>Vui lòng thanh toán sớm để tránh phạt tăng thêm</li>");
        content.append("</ul>");
        content.append("</div>");
        
        // Khuyến nghị
        content.append("<div style='background-color: #d4edda; border: 1px solid #c3e6cb; border-radius: 6px; padding: 20px; margin-bottom: 25px;'>");
        content.append("<h3 style='color: #155724; margin: 0 0 15px 0; font-size: 18px;'>Khuyến nghị</h3>");
        content.append("<p style='margin: 0; color: #155724; font-weight: bold;'>Thanh toán ngay để tránh phạt tăng thêm!</p>");
        content.append("</div>");
        
        // Link xem chi tiết hóa đơn
        content.append("<div style='background-color: #fff7e6; border: 1px solid #ffd591; border-radius: 6px; padding: 20px; margin-bottom: 25px;'>");
        content.append("<h3 style='color: #d46b08; margin: 0 0 15px 0; font-size: 18px;'>Xem chi tiết hóa đơn</h3>");
        content.append("<p style='margin: 0 0 10px 0; color: #d46b08;'>Để xem chi tiết hóa đơn trong hệ thống, vui lòng bấm vào nút bên dưới:</p>");
        content.append("<div style='text-align: center; margin: 15px 0;'>");
        content.append("<a href='http://mpbhms.online/renter/bills/").append(penaltyBill.getId()).append("' style='background-color: #1890ff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;'>Xem chi tiết & Thanh toán</a>");
        content.append("</div>");
        content.append("<p style='margin: 10px 0 0 0; color: #d46b08; font-size: 14px;'>Link truy cập: <span style='background-color: #f5f5f5; padding: 4px 8px; border-radius: 4px; font-family: monospace; font-size: 12px;'>http://mpbhms.online/renter/bills/").append(penaltyBill.getId()).append("</span></p>");
        content.append("</div>");
        
        // Footer
        content.append("<div style='text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6;'>");
        content.append("<p style='margin: 0; color: #6c757d; font-size: 14px;'>Trân trọng,<br><strong>Ban quản lý tòa nhà</strong></p>");
        content.append("</div>");
        
        content.append("</div>");
        content.append("</div>");
        
        return content.toString();
    }

    @Override
    public void sendOverdueWarningNotification(Bill bill) {
        // Gọi method private đã có
        sendOverdueWarningNotificationInternal(bill);
    }
    
    // 🆕 Gửi thông báo cảnh báo quá hạn với logging (cho manual trigger)
    @Override
    @Transactional
    public void sendOverdueWarningNotificationWithLogging(Bill overdueBill, String clientIp, String userAgent, Long sentByUserId) {
        try {
            // Fetch contract với roomUsers để tránh lazy loading
            Contract contract = contractRepository.findById(overdueBill.getContract().getId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy contract"));
            
            int overdueDays = calculateOverdueDays(overdueBill);
            
            // 1. Gửi thông báo cho người thuê
            if (contract.getRoomUsers() != null) {
                for (RoomUser ru : contract.getRoomUsers()) {
                    if (ru.getUser() != null && Boolean.TRUE.equals(ru.getIsActive())) {
                        // Gửi notification cảnh báo
                        try {
                            NotificationDTO noti = new NotificationDTO();
                            noti.setRecipientId(ru.getUser().getId());
                            noti.setTitle("Cảnh báo hóa đơn quá hạn - Phòng " + contract.getRoom().getRoomNumber());
                            noti.setMessage("Hóa đơn #" + overdueBill.getId() + " đã quá hạn " + overdueDays + " ngày. Số tiền: " + 
                        formatCurrency(overdueBill.getTotalAmount()) + ". Vui lòng thanh toán ngay để tránh bị phạt.");
                            noti.setType(NotificationType.RENT_REMINDER);
                            noti.setMetadata("{\"billId\":" + overdueBill.getId() + ",\"overdueDays\":" + overdueDays + "}");
                            notificationService.createAndSend(noti);
                        } catch (Exception e) {
                            System.err.println("Lỗi gửi notification cảnh báo cho user " + ru.getUser().getId() + ": " + e.getMessage());
                        }
                        
                        // Gửi email cảnh báo
                        if (ru.getUser().getEmail() != null) {
                            try {
                                String subject = "CẢNH BÁO HÓA ĐƠN QUÁ HẠN - Phòng " + contract.getRoom().getRoomNumber();
                                String content = buildOverdueWarningEmailContent(overdueBill, overdueDays);
                                
                                // Tạo PDF hóa đơn gốc
                                byte[] pdfBytes = generateBillPdf(overdueBill.getId());
                                
                                emailService.sendBillWithAttachment(
                                    ru.getUser().getEmail(), 
                                    subject, 
                                    content, 
                                    pdfBytes
                                );
                                
                                // 🆕 Lưu log email đã gửi (giống như API gửi email bình thường)
                                logEmailSent(overdueBill.getId(), ru.getUser().getEmail(), "OVERDUE_WARNING", clientIp, userAgent, sentByUserId);
                                
                                System.out.println("Đã gửi email cảnh báo quá hạn cho " + ru.getUser().getEmail());
                            } catch (Exception e) {
                                System.err.println("Lỗi gửi email cảnh báo cho " + ru.getUser().getEmail() + ": " + e.getMessage());
                            }
                        }
                    }
                }
            }
            
            // 2. 🆕 Gửi thông báo cho landlord
            sendLandlordOverdueNotification(overdueBill, overdueDays);
            
        } catch (Exception e) {
            System.err.println("Lỗi trong sendOverdueWarningNotificationWithLogging: " + e.getMessage());
            e.printStackTrace();
        }
    }
    
    // 🆕 Method mới: Gửi cảnh báo cho hóa đơn quá hạn 7 ngày (chỉ 1 lần duy nhất)
    @Override
    @Transactional
    public void sendOverdueWarningNotificationFor7Days() {
        System.out.println("[" + java.time.LocalDateTime.now() + "] Bắt đầu gửi cảnh báo cho hóa đơn quá hạn 7 ngày");
        
        List<Bill> overdueBills = getOverdueBills();
        int warningCount = 0;
        
        for (Bill overdueBill : overdueBills) {
            try {
                // Chỉ xử lý hóa đơn gốc, không phải hóa đơn phạt
                if (overdueBill.getBillType() == BillType.LATE_PENALTY) {
                    continue;
                }
                
                int overdueDays = calculateOverdueDays(overdueBill);
                
                // Chỉ gửi cảnh báo cho hóa đơn quá hạn đúng 7 ngày
                if (overdueDays == 7) {
                    // 🆕 KIỂM TRA: Chỉ gửi cảnh báo 1 lần duy nhất
                    if (warningSentBills.contains(overdueBill.getId())) {
                        System.out.println("[" + java.time.LocalDateTime.now() + "] Hóa đơn #" + overdueBill.getId() + " đã được gửi cảnh báo trước đó, bỏ qua");
                        continue;
                    }
                    
                    System.out.println("[" + java.time.LocalDateTime.now() + "] Gửi cảnh báo cho hóa đơn #" + overdueBill.getId() + " (quá hạn 7 ngày)");
                    sendOverdueWarningNotificationInternal(overdueBill);
                    
                    // 🆕 ĐÁNH DẤU: Đã gửi cảnh báo cho bill này
                    warningSentBills.add(overdueBill.getId());
                    warningCount++;
                    
                    System.out.println("[" + java.time.LocalDateTime.now() + "] Đã đánh dấu hóa đơn #" + overdueBill.getId() + " là đã gửi cảnh báo");
                }
                
            } catch (Exception e) {
                System.err.println("[" + java.time.LocalDateTime.now() + "] Lỗi khi gửi cảnh báo cho hóa đơn #" + overdueBill.getId() + ": " + e.getMessage());
                e.printStackTrace();
            }
        }
        
        System.out.println("[" + java.time.LocalDateTime.now() + "] Hoàn thành: Đã gửi " + warningCount + " cảnh báo cho hóa đơn quá hạn 7 ngày");
    }

    // 🆕 Method để reset cache cảnh báo (dùng khi restart server)
    public void resetWarningCache() {
        warningSentBills.clear();
        System.out.println("[" + java.time.LocalDateTime.now() + "] Đã reset cache cảnh báo hóa đơn quá hạn");
    }
    
    // 🆕 Method để xem cache hiện tại
    public Set<Long> getWarningCache() {
        return new HashSet<>(warningSentBills);
    }
    
    @Override
    public String buildNormalBillEmailContent(Bill bill, String paymentUrl) {
        StringBuilder contentBody = new StringBuilder();
        
        // Thông tin hóa đơn
        contentBody.append("<div style='background-color: #e6f7ff; border: 1px solid #91d5ff; border-radius: 6px; padding: 20px; margin-bottom: 25px;'>");
        contentBody.append("<h3 style='color: #0050b3; margin: 0 0 15px 0; font-size: 18px;'>Thông tin hóa đơn</h3>");
        contentBody.append("<table style='width: 100%; border-collapse: collapse;'>");
        contentBody.append("<tr><td style='padding: 8px 0; font-weight: bold; color: #333;'>Phòng:</td><td style='padding: 8px 0; color: #666;'>").append(bill.getRoom().getRoomNumber()).append("</td></tr>");
        contentBody.append("<tr><td style='padding: 8px 0; font-weight: bold; color: #333;'>Mã hóa đơn:</td><td style='padding: 8px 0; color: #666;'>#").append(bill.getId()).append("</td></tr>");
        contentBody.append("<tr><td style='padding: 8px 0; font-weight: bold; color: #333;'>Loại hóa đơn:</td><td style='padding: 8px 0; color: #666;'>").append(getBillTypeVietnamese(bill.getBillType())).append("</td></tr>");
        contentBody.append("<tr><td style='padding: 8px 0; font-weight: bold; color: #333;'>Từ ngày:</td><td style='padding: 8px 0; color: #666;'>").append(formatDateTime(bill.getFromDate())).append("</td></tr>");
        contentBody.append("<tr><td style='padding: 8px 0; font-weight: bold; color: #333;'>Đến ngày:</td><td style='padding: 8px 0; color: #666;'>").append(formatDateTime(bill.getToDate())).append("</td></tr>");
        // Hạn thanh toán: ưu tiên dueDate nếu có, nếu không thì toDate + 7 ngày
        java.time.Instant __due = bill.getDueDate() != null ? bill.getDueDate() : bill.getToDate().plusSeconds(7 * 24 * 60 * 60);
        contentBody.append("<tr><td style='padding: 8px 0; font-weight: bold; color: #333;'>Hạn thanh toán:</td><td style='padding: 8px 0; color: #faad14; font-weight: bold;'>").append(formatDateTime(__due)).append("</td></tr>");
        // Tổng/đã trả/còn nợ
        java.math.BigDecimal __total = bill.getTotalAmount();
        java.math.BigDecimal __paid = bill.getPaidAmount() != null ? bill.getPaidAmount() : java.math.BigDecimal.ZERO;
        java.math.BigDecimal __outstanding = bill.getOutstandingAmount() != null ? bill.getOutstandingAmount() : __total.subtract(__paid);
        contentBody.append("<tr><td style='padding: 8px 0; font-weight: bold; color: #333;'>Tổng tiền:</td><td style='padding: 8px 0; color: #1890ff; font-weight: bold; font-size: 16px;'>").append(formatCurrency(__total)).append("</td></tr>");
        contentBody.append("<tr><td style='padding: 8px 0; font-weight: bold; color: #333;'>Đã thanh toán (gốc):</td><td style='padding: 8px 0; color: #52c41a; font-weight: bold;'>").append(formatCurrency(__paid)).append("</td></tr>");
        contentBody.append("<tr><td style='padding: 8px 0; font-weight: bold; color: #333;'>Còn nợ:</td><td style='padding: 8px 0; color: #ff4d4f; font-weight: bold;'>").append(formatCurrency(__outstanding)).append("</td></tr>");
        contentBody.append("</table>");
        contentBody.append("</div>");
        
        // Thông báo
        contentBody.append("<div style='background-color: #f6ffed; border: 1px solid #b7eb8f; border-radius: 6px; padding: 20px; margin-bottom: 25px;'>");
        contentBody.append("<h3 style='color: #389e0d; margin: 0 0 15px 0; font-size: 18px;'>Thông báo</h3>");
        contentBody.append("<p style='margin: 0; color: #389e0d;'>Xin chào, vui lòng xem hóa đơn đính kèm.</p>");
        contentBody.append("</div>");
        
        // Xem chi tiết hóa đơn
        contentBody.append("<div style='background-color: #fff7e6; border: 1px solid #ffd591; border-radius: 6px; padding: 20px; margin-bottom: 25px;'>");
        contentBody.append("<h3 style='color: #d46b08; margin: 0 0 15px 0; font-size: 18px;'>Xem chi tiết hóa đơn</h3>");
        contentBody.append("<p style='margin: 0 0 10px 0; color: #d46b08;'>Để xem chi tiết hóa đơn trong hệ thống, vui lòng bấm vào nút bên dưới:</p>");
        contentBody.append("<div style='text-align: center; margin: 15px 0;'>");
        contentBody.append("<a href='http://mpbhms.online/renter/bills/").append(bill.getId()).append("' style='background-color: #1890ff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;'>Xem chi tiết & Thanh toán</a>");
        contentBody.append("</div>");
        contentBody.append("<p style='margin: 10px 0 0 0; color: #d46b08; font-size: 14px;'>Link truy cập: <span style='background-color: #f5f5f5; padding: 4px 8px; border-radius: 4px; font-family: monospace; font-size: 12px;'>http://mpbhms.online/renter/bills/").append(bill.getId()).append("</span></p>");
        contentBody.append("</div>");
        
        // Thông tin thanh toán
        if (paymentUrl != null) {
            contentBody.append("<div style='background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 6px; padding: 20px; margin-bottom: 25px;'>");
            contentBody.append("<h3 style='color: #0369a1; margin: 0 0 15px 0; font-size: 18px;'>Thanh toán</h3>");
            contentBody.append("<p style='margin: 0 0 10px 0; color: #0369a1;'>Để thanh toán hóa đơn, vui lòng bấm vào nút bên dưới:</p>");
            contentBody.append("<div style='text-align: center; margin: 15px 0;'>");
            contentBody.append("<a href='").append(paymentUrl).append("' style='background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;'>Thanh toán ngay</a>");
            contentBody.append("</div>");
            contentBody.append("<p style='margin: 10px 0 0 0; color: #0369a1; font-size: 14px;'>Hoặc copy link: <span style='background-color: #f5f5f5; padding: 4px 8px; border-radius: 4px; font-family: monospace; font-size: 12px;'>").append(paymentUrl).append("</span></p>");
            contentBody.append("</div>");
        }
        
        return buildStandardEmailTemplate("HÓA ĐƠN MỚI", "#1890ff", contentBody.toString());
    }
    
    @Override
    public String buildSimpleBillEmailContent(Bill bill) {
        StringBuilder contentBody = new StringBuilder();
        
        // Thông tin hóa đơn
        contentBody.append("<div style='background-color: #e6f7ff; border: 1px solid #91d5ff; border-radius: 6px; padding: 20px; margin-bottom: 25px;'>");
        contentBody.append("<h3 style='color: #0050b3; margin: 0 0 15px 0; font-size: 18px;'>Thông tin hóa đơn</h3>");
        contentBody.append("<table style='width: 100%; border-collapse: collapse;'>");
        contentBody.append("<tr><td style='padding: 8px 0; font-weight: bold; color: #333;'>Phòng:</td><td style='padding: 8px 0; color: #666;'>").append(bill.getRoom().getRoomNumber()).append("</td></tr>");
        contentBody.append("<tr><td style='padding: 8px 0; font-weight: bold; color: #333;'>Mã hóa đơn:</td><td style='padding: 8px 0; color: #666;'>#").append(bill.getId()).append("</td></tr>");
        contentBody.append("<tr><td style='padding: 8px 0; font-weight: bold; color: #333;'>Loại hóa đơn:</td><td style='padding: 8px 0; color: #666;'>").append(getBillTypeVietnamese(bill.getBillType())).append("</td></tr>");
        contentBody.append("<tr><td style='padding: 8px 0; font-weight: bold; color: #333;'>Từ ngày:</td><td style='padding: 8px 0; color: #666;'>").append(formatDateTime(bill.getFromDate())).append("</td></tr>");
        contentBody.append("<tr><td style='padding: 8px 0; font-weight: bold; color: #333;'>Đến ngày:</td><td style='padding: 8px 0; color: #666;'>").append(formatDateTime(bill.getToDate())).append("</td></tr>");
        // Hạn thanh toán: ưu tiên dueDate nếu có, nếu không thì toDate + 7 ngày
        java.time.Instant __due = bill.getDueDate() != null ? bill.getDueDate() : bill.getToDate().plusSeconds(7 * 24 * 60 * 60);
        contentBody.append("<tr><td style='padding: 8px 0; font-weight: bold; color: #333;'>Hạn thanh toán:</td><td style='padding: 8px 0; color: #faad14; font-weight: bold;'>").append(formatDateTime(__due)).append("</td></tr>");
        // Tổng/đã trả/còn nợ
        java.math.BigDecimal __total = bill.getTotalAmount();
        java.math.BigDecimal __paid = bill.getPaidAmount() != null ? bill.getPaidAmount() : java.math.BigDecimal.ZERO;
        java.math.BigDecimal __outstanding = bill.getOutstandingAmount() != null ? bill.getOutstandingAmount() : __total.subtract(__paid);
        contentBody.append("<tr><td style='padding: 8px 0; font-weight: bold; color: #333;'>Tổng tiền:</td><td style='padding: 8px 0; color: #1890ff; font-weight: bold; font-size: 16px;'>").append(formatCurrency(__total)).append("</td></tr>");
        contentBody.append("<tr><td style='padding: 8px 0; font-weight: bold; color: #333;'>Đã thanh toán (gốc):</td><td style='padding: 8px 0; color: #52c41a; font-weight: bold;'>").append(formatCurrency(__paid)).append("</td></tr>");
        contentBody.append("<tr><td style='padding: 8px 0; font-weight: bold; color: #333;'>Còn nợ:</td><td style='padding: 8px 0; color: #ff4d4f; font-weight: bold;'>").append(formatCurrency(__outstanding)).append("</td></tr>");
        contentBody.append("</table>");
        contentBody.append("</div>");
        
        // Thông báo
        contentBody.append("<div style='background-color: #f6ffed; border: 1px solid #b7eb8f; border-radius: 6px; padding: 20px; margin-bottom: 25px;'>");
        contentBody.append("<h3 style='color: #389e0d; margin: 0 0 15px 0; font-size: 18px;'>Thông báo</h3>");
        contentBody.append("<p style='margin: 0; color: #389e0d;'>Xin chào, vui lòng xem hóa đơn đính kèm và truy cập link bên dưới để xem chi tiết đầy đủ.</p>");
        contentBody.append("</div>");
        
        // Xem chi tiết hóa đơn - chỉ có link này thôi
        contentBody.append("<div style='background-color: #fff7e6; border: 1px solid #ffd591; border-radius: 6px; padding: 20px; margin-bottom: 25px;'>");
        contentBody.append("<h3 style='color: #d46b08; margin: 0 0 15px 0; font-size: 18px;'>Xem chi tiết hóa đơn</h3>");
        contentBody.append("<p style='margin: 0 0 10px 0; color: #d46b08;'>Để xem chi tiết hóa đơn và thực hiện thanh toán trong hệ thống, vui lòng bấm vào nút bên dưới:</p>");
        contentBody.append("<div style='text-align: center; margin: 15px 0;'>");
        contentBody.append("<a href='http://mpbhms.online/renter/bills/").append(bill.getId()).append("' style='background-color: #1890ff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;'>Xem chi tiết & Thanh toán</a>");
        contentBody.append("</div>");
        contentBody.append("<p style='margin: 10px 0 0 0; color: #d46b08; font-size: 14px;'>Link truy cập: <span style='background-color: #f5f5f5; padding: 4px 8px; border-radius: 4px; font-family: monospace; font-size: 12px;'>http://mpbhms.online/renter/bills/").append(bill.getId()).append("</span></p>");
        contentBody.append("</div>");
        
        return buildStandardEmailTemplate("HÓA ĐƠN MỚI", "#1890ff", contentBody.toString());
    }

    // Helper method để việt hóa loại hóa đơn
    private String getBillTypeVietnamese(BillType billType) {
        switch (billType) {
            case CONTRACT_TOTAL:
                return "Tổng hợp đồng";
            case CONTRACT_INIT:
                return "Khởi tạo hợp đồng";
            case OTHER:
                return "Khác";
            case CUSTOM:
                return "Tùy chỉnh";
            case SERVICE:
                return "Dịch vụ";
            case CONTRACT_ROOM_RENT:
                return "Tiền phòng";
            case LATE_PENALTY:
                return "Phạt quá hạn";
            default:
                return billType.toString();
        }
    }

    // Helper method để format ngày giờ
    private String formatDateTime(Instant instant) {
        if (instant == null) return "N/A";
        
        java.time.ZoneId zoneId = java.time.ZoneId.of("Asia/Ho_Chi_Minh");
        java.time.ZonedDateTime zonedDateTime = instant.atZone(zoneId);
        java.time.format.DateTimeFormatter formatter = java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy");
        
        return zonedDateTime.format(formatter);
    }

    // Helper method để rút gọn URL
    private String shortenUrl(String url) {
        if (url == null || url.length() <= 50) return url;
        return url.substring(0, 47) + "...";
    }

    // 🆕 Helper: gửi email + notification xác nhận đã thanh toán đầy đủ
    private void sendBillPaidConfirmation(Bill bill) {
        try {
            // Email xác nhận dùng template chuẩn
            if (bill.getContract() != null && bill.getContract().getRoomUsers() != null) {
                var mainRenter = bill.getContract().getRoomUsers().stream()
                    .filter(ru -> ru.getUser() != null && Boolean.TRUE.equals(ru.getIsActive()) && ru.getUser().getEmail() != null)
                    .findFirst().orElse(null);
                if (mainRenter != null) {
                    StringBuilder contentBody = new StringBuilder();
                    contentBody.append("<div style='background-color: #f6ffed; border: 1px solid #b7eb8f; border-radius: 6px; padding: 20px; margin-bottom: 25px;'>");
                    contentBody.append("<h3 style='color: #389e0d; margin: 0 0 15px 0; font-size: 18px;'>Thông tin hóa đơn</h3>");
                    contentBody.append("<table style='width: 100%; border-collapse: collapse;'>");
                    contentBody.append("<tr><td style='padding: 8px 0; font-weight: bold; color: #333;'>Phòng:</td><td style='padding: 8px 0; color: #666;'>").append(bill.getRoom().getRoomNumber()).append("</td></tr>");
                    contentBody.append("<tr><td style='padding: 8px 0; font-weight: bold; color: #333;'>Mã hóa đơn:</td><td style='padding: 8px 0; color: #666;'>#").append(bill.getId()).append("</td></tr>");
                    contentBody.append("<tr><td style='padding: 8px 0; font-weight: bold; color: #333;'>Tổng tiền:</td><td style='padding: 8px 0; color: #1890ff; font-weight: bold; font-size: 16px;'>").append(formatCurrency(bill.getTotalAmount())).append("</td></tr>");
                    contentBody.append("<tr><td style='padding: 8px 0; font-weight: bold; color: #333;'>Đã thanh toán (gốc):</td><td style='padding: 8px 0; color: #52c41a; font-weight: bold;'>").append(formatCurrency(bill.getPaidAmount())).append("</td></tr>");
                    contentBody.append("<tr><td style='padding: 8px 0; font-weight: bold; color: #333;'>Còn nợ:</td><td style='padding: 8px 0; color: #52c41a; font-weight: bold;'>0 ₫</td></tr>");
                    contentBody.append("<tr><td style='padding: 8px 0; font-weight: bold; color: #333;'>Ngày thanh toán:</td><td style='padding: 8px 0; color: #666;'>").append(formatDateTime(bill.getPaidDate())).append("</td></tr>");
                    contentBody.append("</table>");
                    contentBody.append("</div>");
                    
                    contentBody.append("<div style='background-color: #f6ffed; border: 1px solid #b7eb8f; border-radius: 6px; padding: 20px; margin-bottom: 25px;'>");
                    contentBody.append("<h3 style='color: #389e0d; margin: 0 0 15px 0; font-size: 18px;'>Chúc mừng!</h3>");
                    contentBody.append("<p style='margin: 0; color: #389e0d; font-weight: bold;'>🎉 Hóa đơn #").append(bill.getId()).append(" đã được thanh toán đầy đủ. Cảm ơn bạn đã sử dụng dịch vụ!</p>");
                    contentBody.append("</div>");
                    
                    String emailContent = buildStandardEmailTemplate("XÁC NHẬN ĐÃ THANH TOÁN", "#52c41a", contentBody.toString());
                    emailService.sendNotificationEmail(
                        mainRenter.getUser().getEmail(),
                        "Xác nhận đã thanh toán - Hóa đơn #" + bill.getId(),
                        emailContent
                    );
                }
            }

            // Notification hệ thống
            if (bill.getContract() != null && bill.getContract().getRoomUsers() != null) {
                for (RoomUser ru : bill.getContract().getRoomUsers()) {
                    if (ru.getUser() != null && Boolean.TRUE.equals(ru.getIsActive())) {
                        NotificationDTO noti = new NotificationDTO();
                        noti.setRecipientId(ru.getUser().getId());
                        noti.setTitle("Hóa đơn đã được thanh toán");
                        noti.setMessage("Hóa đơn #" + bill.getId() + " đã thanh toán đầy đủ. Cảm ơn bạn!");
                        noti.setType(NotificationType.ANNOUNCEMENT);
                        noti.setMetadata("{\"billId\":" + bill.getId() + "}");
                        notificationService.createAndSend(noti);
                    }
                }
            }
        } catch (Exception e) {
            System.err.println("Lỗi sendBillPaidConfirmation: " + e.getMessage());
        }
    }
    
    // Lấy số tiền nợ từ hóa đơn trước
    private BigDecimal getOutstandingDebtFromPreviousBills(Contract contract, LocalDate currentFromDate) {
        BigDecimal totalOutstanding = BigDecimal.ZERO;
        
        try {
            // Lấy tất cả hóa đơn của hợp đồng này
            List<Bill> allBills = billRepository.findAll().stream()
                .filter(bill -> bill.getContract().getId().equals(contract.getId()))
                .sorted((b1, b2) -> b2.getFromDate().compareTo(b1.getFromDate())) // Sắp xếp theo fromDate giảm dần
                .toList();
            
            for (Bill bill : allBills) {
                // Chỉ xét hóa đơn có fromDate < currentFromDate (hóa đơn trước)
                LocalDate billFromDate = bill.getFromDate().atZone(ZoneId.of("Asia/Ho_Chi_Minh")).toLocalDate();
                if (billFromDate.isBefore(currentFromDate)) {
                    // Tính số tiền còn nợ của hóa đơn này
                    BigDecimal outstandingAmount = bill.getOutstandingAmount() != null ? bill.getOutstandingAmount() : BigDecimal.ZERO;
                    if (outstandingAmount.compareTo(BigDecimal.ZERO) > 0) {
                        totalOutstanding = totalOutstanding.add(outstandingAmount);
                    }
                }
            }
        } catch (Exception e) {
            System.err.println("Lỗi khi tính toán số tiền nợ từ hóa đơn trước: " + e.getMessage());
        }
        
        return totalOutstanding;
    }

    @Override
    public int getPaymentCount(Long billId) {
        // Đếm số lần thanh toán THÀNH CÔNG (chỉ SUCCESS, không bao gồm PENDING/REJECTED)
        try {
            long count = paymentHistoryService.countSuccessfulPaymentsByBillId(billId);
            return (int) count;
        } catch (Exception e) {
            System.err.println("Lỗi khi đếm số lần thanh toán thành công cho hóa đơn " + billId + ": " + e.getMessage());
            return 0;
        }
    }

    @Override
    public int getAllPaymentCount(Long billId) {
        // Đếm tổng số lần thanh toán (bao gồm tất cả status: SUCCESS, PENDING, REJECTED)
        // Dùng để tạo paymentNumber
        try {
            long count = paymentHistoryService.countAllPaymentsByBillId(billId);
            return (int) count;
        } catch (Exception e) {
            System.err.println("Lỗi khi đếm tổng số lần thanh toán cho hóa đơn " + billId + ": " + e.getMessage());
            return 0;
        }
    }

    @Override
    public BigDecimal calculateNextPaymentFee(int paymentCount) {
        switch (paymentCount) {
            case 0:
                return new BigDecimal("200000"); // 200.000 VNĐ cho lần thanh toán đầu tiên
            case 1:
                return new BigDecimal("500000"); // 500.000 VNĐ cho lần thanh toán thứ 2
            case 2:
                return new BigDecimal("1000000"); // 1.000.000 VNĐ cho lần thanh toán thứ 3
            default:
                return new BigDecimal("1000000"); // Tối đa 1.000.000 VNĐ cho các lần sau
        }
    }

    // Helper methods for localization
    private String getPaymentMethodDisplay(String paymentMethod) {
        if ("VNPAY".equals(paymentMethod)) {
            return "VNPAY";
        } else if ("CASH".equals(paymentMethod)) {
            return "Tiền mặt";
        } else if ("BANK_TRANSFER".equals(paymentMethod)) {
            return "Chuyển khoản";
        } else {
            return paymentMethod;
        }
    }

    private String getStatusDisplay(String status) {
        if ("SUCCESS".equals(status)) {
            return "Thành công";
        } else if ("FAILED".equals(status)) {
            return "Thất bại";
        } else if ("PENDING".equals(status)) {
            return "Đang xử lý";
        } else if ("COMPLETED".equals(status)) {
            return "Hoàn thành";
        } else if ("REJECTED".equals(status)) {
            return "Từ chối";
        } else {
            return status;
        }
    }

    private String getPaymentTypeDisplay(Boolean isPartialPayment) {
        if (Boolean.TRUE.equals(isPartialPayment)) {
            return "Thanh toán từng phần";
        } else {
            return "Thanh toán đầy đủ";
        }
    }

    // 🆕 Anti-spam methods implementation
    @Override
    public void checkEmailSpamLimit(Long billId, String ipAddress, String emailType) {
        Instant oneDayAgo = Instant.now().minus(24, ChronoUnit.HOURS);

        // Kiểm tra: Chỉ được gửi 1 email mỗi ngày cho 1 hóa đơn
        long emailsInLastDay = emailSentLogRepository.countEmailsSentSince(billId, emailType, oneDayAgo);
        if (emailsInLastDay >= 1) {
            throw new RuntimeException("Mỗi hóa đơn chỉ được gửi email 1 lần trong 24 giờ. Vui lòng thử lại vào ngày mai.");
        }
    }

    @Override
    public void logEmailSent(Long billId, String recipientEmail, String emailType, String ipAddress, String userAgent, Long sentByUserId) {
        try {
            Bill bill = billRepository.findById(billId).orElse(null);
            if (bill != null) {
                EmailSentLog log = new EmailSentLog();
                log.setBill(bill);
                log.setRecipientEmail(recipientEmail);
                log.setEmailType(emailType);
                log.setIpAddress(ipAddress);
                log.setUserAgent(userAgent);
                log.setSentByUserId(sentByUserId);
                emailSentLogRepository.save(log);
            }
        } catch (Exception e) {
            // Log error nhưng không làm fail việc gửi email
            System.err.println("Lỗi khi lưu email log: " + e.getMessage());
        }
    }

}
