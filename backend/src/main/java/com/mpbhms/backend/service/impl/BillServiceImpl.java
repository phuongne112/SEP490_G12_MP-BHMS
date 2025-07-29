package com.mpbhms.backend.service.impl;

import com.mpbhms.backend.dto.BillDetailResponse;
import com.mpbhms.backend.dto.BillResponse;
import com.mpbhms.backend.entity.*;
import com.mpbhms.backend.enums.BillItemType;
import com.mpbhms.backend.enums.BillType;
import com.mpbhms.backend.enums.ContractStatus;
import com.mpbhms.backend.enums.PaymentCycle;
import com.mpbhms.backend.enums.ServiceType;
import com.mpbhms.backend.exception.BusinessException;
import com.mpbhms.backend.exception.NotFoundException;
import com.mpbhms.backend.repository.BillRepository;
import com.mpbhms.backend.repository.ContractRepository;
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
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
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
import java.util.stream.Collectors;
import com.mpbhms.backend.service.EmailService;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class BillServiceImpl implements BillService {

    private final BillRepository billRepository;
    private final ContractRepository contractRepository;
    private final ServiceReadingRepository serviceReadingRepository;
    private final ServiceRepository serviceRepository;
    private final ServiceService serviceService;
    private final RoomRepository roomRepository;
    private final NotificationService notificationService;
    private final EmailService emailService;

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
                // Nước & dịch vụ khác: tính cố định
                BigDecimal unitPrice = serviceService.getServicePriceAtDate(service.getId(), fromDate);
                BillDetail fixedDetail = new BillDetail();
                fixedDetail.setItemType(BillItemType.SERVICE);
                fixedDetail.setDescription("Dịch vụ cố định: " + service.getServiceName() + " từ " + fromDate + " đến " + toDate);
                fixedDetail.setService(service);
                fixedDetail.setUnitPriceAtBill(unitPrice);
                fixedDetail.setItemAmount(unitPrice);
                fixedDetail.setCreatedDate(Instant.now());
                details.add(fixedDetail);
                totalAmount = totalAmount.add(unitPrice);
            }
        }

        // 5. Tạo Bill
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
            "\n🏁 GENERATE BILL REQUEST:\n" +
            "Contract ID: %d\n" +
            "From Date: %s\n" +
            "To Date: %s\n" +
            "Bill Type: %s\n" +
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
        System.out.println("🔍 DETECTION RESULT: isCustomPeriod = " + isCustomPeriod);
        
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
                "✅ CUSTOM BILLING: %s to %s (%d days) -> %d months (Price: %,.0f × %d = %,.0f VND)",
                fromDate, toDate, daysBetween, months, 
                room.getPricePerMonth(), months, room.getPricePerMonth() * months
            ));
        } else {
            // Với chu kỳ chuẩn, dùng logic cũ
            months = countMonths(cycle);
            System.out.println(String.format(
                "✅ STANDARD BILLING: %s cycle -> %d months (Price: %,.0f × %d = %,.0f VND)", 
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
                    BillDetail fixedDetail = new BillDetail();
                    fixedDetail.setItemType(BillItemType.SERVICE);
                    fixedDetail.setDescription("Dịch vụ cố định: " + service.getServiceName() + " từ " + fromDate + " đến " + toDate);
                    fixedDetail.setService(service);
                    fixedDetail.setUnitPriceAtBill(unitPrice);
                    
                    // Tính toán tiền dịch vụ cố định theo tỷ lệ thời gian
                    BigDecimal serviceAmount;
                    if (isCustomPeriod) {
                        // Với khoảng ngày tùy chọn, tính theo tỷ lệ
                        long daysBetween = ChronoUnit.DAYS.between(fromDate, toDate) + 1;
                        double ratio = daysBetween / 30.0; // Tỷ lệ so với 1 tháng
                        serviceAmount = unitPrice.multiply(BigDecimal.valueOf(ratio));
                    } else {
                        // Với chu kỳ chuẩn, tính theo số tháng chu kỳ
                        int cycleMonths = countMonths(cycle);
                        serviceAmount = unitPrice.multiply(BigDecimal.valueOf(cycleMonths));
                    }
                    
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
        BillResponse response = new BillResponse();
        response.setId(bill.getId());
        response.setContractId(bill.getContract().getId());
        response.setRoomId(bill.getRoom().getId());
        
        // Fetch room để tránh lazy loading
        try {
            Room room = roomRepository.findById(bill.getRoom().getId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy room"));
            response.setRoomNumber(room.getRoomNumber());
        } catch (Exception e) {
            System.err.println("❌ Lỗi khi fetch room cho bill #" + bill.getId() + ": " + e.getMessage());
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

        // Thông tin phạt quá hạn
        if (bill.getOriginalBill() != null) {
            response.setOriginalBillId(bill.getOriginalBill().getId());
        }
        response.setPenaltyRate(bill.getPenaltyRate());
        
        // Tính toán số ngày quá hạn cho tất cả hóa đơn
        if (bill.getOverdueDays() != null) {
            // Nếu đã có giá trị (hóa đơn phạt), sử dụng giá trị đó
            response.setOverdueDays(bill.getOverdueDays());
        } else {
            // Tính toán số ngày quá hạn cho hóa đơn thường
            response.setOverdueDays(calculateOverdueDays(bill));
        }
        
        response.setPenaltyAmount(bill.getPenaltyAmount());
        response.setNotes(bill.getNotes());

        List<BillDetailResponse> detailResponses = new ArrayList<>();
        for (BillDetail detail : bill.getBillDetails()) {
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
        response.setDetails(detailResponses);
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
                BillDetailResponse detail = new BillDetailResponse();
                detail.setItemType(BillItemType.SERVICE);
                detail.setDescription("Dịch vụ cố định: " + service.getServiceName() + " tháng " + String.format("%02d/%d", month, year));
                detail.setServiceName(service.getServiceName());
                detail.setUnitPriceAtBill(unitPrice);
                detail.setItemAmount(unitPrice);
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
                BillDetail detail = new BillDetail();
                detail.setItemType(BillItemType.SERVICE);
                detail.setDescription("Dịch vụ cố định: " + service.getServiceName() + " tháng " + String.format("%02d/%d", month, year));
                detail.setService(service);
                detail.setUnitPriceAtBill(unitPrice);
                detail.setItemAmount(unitPrice);
                detail.setCreatedDate(Instant.now());
                details.add(detail);
                totalAmount = totalAmount.add(unitPrice);
            }
        }
        Bill bill = new Bill();
        bill.setRoom(room);
        bill.setContract(contract);
        bill.setFromDate(fromInstant);
        bill.setToDate(toInstant);
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
    public void deleteBillById(Long id) {
        Bill bill = billRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Không tìm thấy hóa đơn"));
        if (Boolean.TRUE.equals(bill.getStatus())) {
            throw new BusinessException("Không thể xóa hóa đơn đã thanh toán.");
        }
        billRepository.deleteById(id);
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
                    System.out.println("✅ Bill already exists for this period, skipping");
                    continue;
                }
                
                // Tạo bill mới
                Bill newBill = generateBill(contract.getId(), nextPeriodStart, nextPeriodEnd, BillType.CONTRACT_TOTAL);
                generatedBills.add(toResponse(newBill));
                
                System.out.println("✅ Generated bill #" + newBill.getId() + " - Amount: " + newBill.getTotalAmount() + " VND");
                
            } catch (Exception e) {
                System.out.println("❌ Error processing contract #" + contract.getId() + ": " + e.getMessage());
                // Tiếp tục với contracts khác
            }
        }
        
        System.out.println("\n🏁 BULK GENERATION COMPLETED");
        System.out.println("📊 Generated " + generatedBills.size() + " new bills");
        
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
        Document document = new Document(PageSize.A4, 50, 50, 50, 50);
        try {
            // Load Arial font from resources
            InputStream fontStream = getClass().getClassLoader().getResourceAsStream("fonts/arial.ttf");
            if (fontStream == null) throw new RuntimeException("Không tìm thấy font Arial");
            byte[] fontBytes = fontStream.readAllBytes();
            BaseFont baseFont = BaseFont.createFont("arial.ttf", BaseFont.IDENTITY_H, BaseFont.EMBEDDED, BaseFont.CACHED, fontBytes, null);
            Font titleFont = new Font(baseFont, 18, Font.BOLD);
            Font headerFont = new Font(baseFont, 14, Font.BOLD);
            Font normalFont = new Font(baseFont, 12, Font.NORMAL);
            Font smallBold = new Font(baseFont, 12, Font.BOLD);

            PdfWriter.getInstance(document, baos);
            document.open();

            DateTimeFormatter dateFormatter = DateTimeFormatter.ofPattern("dd/MM/yyyy").withZone(ZoneId.systemDefault());
            DateTimeFormatter dateTimeFormatter = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
            NumberFormat currencyFormat = NumberFormat.getCurrencyInstance(new Locale("vi", "VN"));

            // Việt hóa loại hóa đơn
            String billTypeVN;
            switch (String.valueOf(bill.getBillType())) {
                case "CONTRACT_TOTAL":
                    billTypeVN = "Tổng hợp đồng"; break;
                case "CONTRACT_ROOM_RENT":
                    billTypeVN = "Tiền phòng hợp đồng"; break;
                case "CONTRACT_SERVICE":
                    billTypeVN = "Dịch vụ hợp đồng"; break;
                case "REGULAR":
                    billTypeVN = "Tiền phòng"; break;
                case "SERVICE":
                    billTypeVN = "Dịch vụ"; break;
                case "DEPOSIT":
                    billTypeVN = "Đặt cọc"; break;
                case "CUSTOM":
                    billTypeVN = "Tùy chỉnh"; break;
                default:
                    billTypeVN = String.valueOf(bill.getBillType());
            }
            // Việt hóa chu kỳ thanh toán
            String paymentCycleVN = null;
            if (bill.getContract() != null) {
                switch (String.valueOf(bill.getContract().getPaymentCycle())) {
                    case "MONTHLY":
                        paymentCycleVN = "Hàng tháng"; break;
                    case "QUARTERLY":
                        paymentCycleVN = "Hàng quý"; break;
                    case "YEARLY":
                        paymentCycleVN = "Hàng năm"; break;
                    default:
                        paymentCycleVN = String.valueOf(bill.getContract().getPaymentCycle());
                }
            }

            // Header
            Paragraph header = new Paragraph("HÓA ĐƠN THANH TOÁN", titleFont);
            header.setAlignment(Element.ALIGN_CENTER);
            header.setSpacingAfter(20f);
            document.add(header);

            // Thông tin hóa đơn (bảng)
            PdfPTable infoTable = new PdfPTable(2);
            infoTable.setWidthPercentage(100);
            infoTable.setSpacingAfter(10f);
            infoTable.addCell(new PdfPCell(new Phrase("Mã hóa đơn:", smallBold)));
            infoTable.addCell(new PdfPCell(new Phrase(String.valueOf(bill.getId()), normalFont)));
            infoTable.addCell(new PdfPCell(new Phrase("Loại hóa đơn:", smallBold)));
            infoTable.addCell(new PdfPCell(new Phrase(billTypeVN, normalFont)));
            infoTable.addCell(new PdfPCell(new Phrase("Ngày lập:", smallBold)));
            infoTable.addCell(new PdfPCell(new Phrase(dateTimeFormatter.format(bill.getBillDate().atZone(ZoneId.systemDefault())), normalFont)));
            document.add(new Paragraph("THÔNG TIN HÓA ĐƠN:", headerFont));
            document.add(infoTable);

            // Thông tin phòng (bảng)
            PdfPTable roomTable = new PdfPTable(2);
            roomTable.setWidthPercentage(100);
            roomTable.setSpacingAfter(10f);
            roomTable.addCell(new PdfPCell(new Phrase("Số phòng:", smallBold)));
            roomTable.addCell(new PdfPCell(new Phrase(bill.getRoom().getRoomNumber(), normalFont)));
            if (bill.getRoom().getBuilding() != null && !bill.getRoom().getBuilding().isEmpty()) {
                roomTable.addCell(new PdfPCell(new Phrase("Tòa nhà:", smallBold)));
                roomTable.addCell(new PdfPCell(new Phrase(bill.getRoom().getBuilding(), normalFont)));
            }
            document.add(new Paragraph("THÔNG TIN PHÒNG:", headerFont));
            document.add(roomTable);

            // Thông tin hợp đồng (bảng)
            if (bill.getContract() != null) {
                PdfPTable contractTable = new PdfPTable(2);
                contractTable.setWidthPercentage(100);
                contractTable.setSpacingAfter(10f);
                contractTable.addCell(new PdfPCell(new Phrase("Mã hợp đồng:", smallBold)));
                contractTable.addCell(new PdfPCell(new Phrase(String.valueOf(bill.getContract().getId()), normalFont)));
                contractTable.addCell(new PdfPCell(new Phrase("Chu kỳ thanh toán:", smallBold)));
                contractTable.addCell(new PdfPCell(new Phrase(paymentCycleVN, normalFont)));
                document.add(new Paragraph("THÔNG TIN HỢP ĐỒNG:", headerFont));
                document.add(contractTable);
            }

            // Thông tin người thuê (bảng)
            if (bill.getContract() != null && bill.getContract().getRoomUsers() != null) {
                PdfPTable renterTable = new PdfPTable(2);
                renterTable.setWidthPercentage(100);
                renterTable.setSpacingAfter(10f);
                renterTable.addCell(new PdfPCell(new Phrase("Họ tên", smallBold)));
                renterTable.addCell(new PdfPCell(new Phrase("Số điện thoại", smallBold)));
                for (RoomUser roomUser : bill.getContract().getRoomUsers()) {
                    if (roomUser.getUser() != null && roomUser.getUser().getUserInfo() != null) {
                        renterTable.addCell(new PdfPCell(new Phrase(roomUser.getUser().getUserInfo().getFullName(), normalFont)));
                        renterTable.addCell(new PdfPCell(new Phrase(roomUser.getUser().getUserInfo().getPhoneNumber(), normalFont)));
                    }
                }
                document.add(new Paragraph("NGƯỜI THUÊ:", headerFont));
                document.add(renterTable);
            }

            // Thời gian tính tiền (bảng)
            PdfPTable timeTable = new PdfPTable(2);
            timeTable.setWidthPercentage(100);
            timeTable.setSpacingAfter(10f);
            timeTable.addCell(new PdfPCell(new Phrase("Từ ngày:", smallBold)));
            timeTable.addCell(new PdfPCell(new Phrase(dateFormatter.format(bill.getFromDate().atZone(ZoneId.systemDefault())), normalFont)));
            timeTable.addCell(new PdfPCell(new Phrase("Đến ngày:", smallBold)));
            timeTable.addCell(new PdfPCell(new Phrase(dateFormatter.format(bill.getToDate().atZone(ZoneId.systemDefault())), normalFont)));
            document.add(new Paragraph("THỜI GIAN TÍNH TIỀN:", headerFont));
            document.add(timeTable);

            // Chi tiết hóa đơn (bảng)
            document.add(new Paragraph("CHI TIẾT HÓA ĐƠN:", headerFont));
            PdfPTable detailTable = new PdfPTable(4);
            detailTable.setWidthPercentage(100);
            detailTable.setSpacingAfter(10f);
            detailTable.addCell(new PdfPCell(new Phrase("Diễn giải", smallBold)));
            detailTable.addCell(new PdfPCell(new Phrase("Số lượng", smallBold)));
            detailTable.addCell(new PdfPCell(new Phrase("Đơn giá", smallBold)));
            detailTable.addCell(new PdfPCell(new Phrase("Thành tiền", smallBold)));
            BigDecimal totalAmount = BigDecimal.ZERO;
            for (BillDetail detail : bill.getBillDetails()) {
                detailTable.addCell(new PdfPCell(new Phrase(detail.getDescription(), normalFont)));
                detailTable.addCell(new PdfPCell(new Phrase(detail.getConsumedUnits() != null ? detail.getConsumedUnits().toString() : "-", normalFont)));
                detailTable.addCell(new PdfPCell(new Phrase(detail.getUnitPriceAtBill() != null ? currencyFormat.format(detail.getUnitPriceAtBill()) : "-", normalFont)));
                detailTable.addCell(new PdfPCell(new Phrase(detail.getItemAmount() != null ? currencyFormat.format(detail.getItemAmount()) : "-", normalFont)));
                if (detail.getItemAmount() != null) {
                    totalAmount = totalAmount.add(detail.getItemAmount());
                }
            }
            document.add(detailTable);

            // Tổng tiền và trạng thái
            PdfPTable totalTable = new PdfPTable(2);
            totalTable.setWidthPercentage(60);
            totalTable.setHorizontalAlignment(Element.ALIGN_RIGHT);
            totalTable.setSpacingAfter(10f);
            totalTable.addCell(new PdfPCell(new Phrase("TỔNG CỘNG:", smallBold)));
            totalTable.addCell(new PdfPCell(new Phrase(currencyFormat.format(totalAmount), smallBold)));
            String status = bill.getStatus() ? "ĐÃ THANH TOÁN" : "CHƯA THANH TOÁN";
            totalTable.addCell(new PdfPCell(new Phrase("Trạng thái:", smallBold)));
            totalTable.addCell(new PdfPCell(new Phrase(status, smallBold)));
            document.add(totalTable);

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
        Instant sevenDaysAgo = now.minusSeconds(7 * 24 * 60 * 60); // 7 ngày trước
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
                    noti.setType(NotificationType.BILL_CREATED); // Use specific bill notification type
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
        
        // Nếu đánh dấu là đã thanh toán, cập nhật ngày thanh toán
        if (status) {
            bill.setPaidDate(Instant.now());
        } else {
            bill.setPaidDate(null);
        }
        
        Bill updatedBill = billRepository.save(bill);
        return toResponse(updatedBill);
    }

    @Override
    public BillResponse createLatePenaltyBill(Long originalBillId) {
        Bill originalBill = billRepository.findById(originalBillId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy hóa đơn gốc với ID: " + originalBillId));
        
        // ⚠️ KIỂM TRA QUAN TRỌNG: Không cho phép tạo phạt cho hóa đơn phạt
        if (originalBill.getBillType() == BillType.LATE_PENALTY) {
            throw new BusinessException("Không thể tạo phạt cho hóa đơn phạt. Chỉ có thể tạo phạt cho hóa đơn gốc.");
        }
        
        // Kiểm tra hóa đơn gốc chưa thanh toán
        if (Boolean.TRUE.equals(originalBill.getStatus())) {
            throw new BusinessException("Không thể tạo phạt cho hóa đơn đã thanh toán");
        }
        
        // Tính toán số ngày quá hạn từ hóa đơn gốc
        int overdueDays = calculateOverdueDays(originalBill);
        if (overdueDays <= 0) {
            throw new BusinessException("Hóa đơn chưa quá hạn");
        }
        
        System.out.println("📊 Tạo phạt cho hóa đơn #" + originalBill.getId() + " - Quá hạn: " + overdueDays + " ngày");
        
        // 🆕 LOGIC MỚI: Xóa hóa đơn phạt cũ nếu có và tạo hóa đơn phạt mới với tỷ lệ cao hơn
        if (billRepository.existsByOriginalBillAndBillType(originalBill, BillType.LATE_PENALTY)) {
            // Tìm và xóa hóa đơn phạt cũ
            List<Bill> existingPenaltyBills = billRepository.findAll().stream()
                .filter(bill -> bill.getOriginalBill() != null && 
                               bill.getOriginalBill().getId().equals(originalBill.getId()) && 
                               bill.getBillType() == BillType.LATE_PENALTY)
                .collect(Collectors.toList());
            
            for (Bill existingPenaltyBill : existingPenaltyBills) {
                System.out.println("🔄 Xóa hóa đơn phạt cũ #" + existingPenaltyBill.getId() + " để tạo phạt mới với tỷ lệ cao hơn");
                billRepository.delete(existingPenaltyBill);
            }
        }
        
        // Tính toán phạt với số ngày quá hạn hiện tại
        BigDecimal penaltyAmount = calculateLatePenalty(originalBill.getTotalAmount(), overdueDays);
        
        // Tạo hóa đơn phạt mới
        Bill penaltyBill = new Bill();
        penaltyBill.setRoom(originalBill.getRoom());
        penaltyBill.setContract(originalBill.getContract());
        penaltyBill.setFromDate(originalBill.getToDate()); // Từ ngày hết hạn hóa đơn gốc
        penaltyBill.setToDate(Instant.now()); // Đến ngày hiện tại
        penaltyBill.setPaymentCycle(originalBill.getPaymentCycle());
        penaltyBill.setBillType(BillType.LATE_PENALTY);
        penaltyBill.setBillDate(Instant.now());
        penaltyBill.setTotalAmount(penaltyAmount);
        penaltyBill.setStatus(false);
        penaltyBill.setOriginalBill(originalBill);
        penaltyBill.setPenaltyRate(calculatePenaltyRate(overdueDays));
        
        // ⚠️ QUAN TRỌNG: Set overdueDays từ hóa đơn gốc, không tính lại từ hóa đơn phạt
        penaltyBill.setOverdueDays(overdueDays);
        
        penaltyBill.setPenaltyAmount(penaltyAmount);
        penaltyBill.setNotes("Phạt quá hạn cho hóa đơn #" + originalBill.getId() + " - Quá hạn " + overdueDays + " ngày (Tỷ lệ: " + penaltyBill.getPenaltyRate() + "%)");
        
        // Tạo chi tiết hóa đơn phạt
        List<BillDetail> penaltyDetails = new ArrayList<>();
        BillDetail penaltyDetail = new BillDetail();
        penaltyDetail.setItemType(BillItemType.LATE_PENALTY);
        penaltyDetail.setDescription("Phạt quá hạn hóa đơn #" + originalBill.getId() + " - " + overdueDays + " ngày quá hạn (" + penaltyBill.getPenaltyRate() + "%)");
        penaltyDetail.setItemAmount(penaltyAmount);
        penaltyDetail.setCreatedDate(Instant.now());
        penaltyDetail.setBill(penaltyBill);
        penaltyDetails.add(penaltyDetail);
        
        penaltyBill.setBillDetails(penaltyDetails);
        
        Bill savedPenaltyBill = billRepository.save(penaltyBill);
        
        // Gửi thông báo
        sendPenaltyNotification(savedPenaltyBill);
        
        return toResponse(savedPenaltyBill);
    }

    @Override
    @Transactional
    public List<BillResponse> checkAndCreateLatePenalties() {
        System.out.println("🔍 [" + java.time.LocalDateTime.now() + "] Bắt đầu checkAndCreateLatePenalties()");
        
        List<Bill> overdueBills = getOverdueBills();
        List<BillResponse> createdPenalties = new ArrayList<>();
        
        System.out.println("🔍 [" + java.time.LocalDateTime.now() + "] Kiểm tra " + overdueBills.size() + " hóa đơn quá hạn...");
        
        for (Bill overdueBill : overdueBills) {
            try {
                System.out.println("🔍 [" + java.time.LocalDateTime.now() + "] Xử lý hóa đơn #" + overdueBill.getId() + 
                    " - Loại: " + overdueBill.getBillType() + " - toDate: " + overdueBill.getToDate());
                
                // ⚠️ KIỂM TRA BỔ SUNG: Đảm bảo không tạo phạt cho hóa đơn phạt
                if (overdueBill.getBillType() == BillType.LATE_PENALTY) {
                    System.out.println("⚠️ [" + java.time.LocalDateTime.now() + "] Bỏ qua hóa đơn phạt #" + overdueBill.getId() + " - Không tạo phạt chồng phạt");
                    continue;
                }
                
                // 🆕 Kiểm tra xem đã có phạt cho hóa đơn này chưa
                List<Bill> existingPenalties = billRepository.findAll().stream()
                    .filter(bill -> bill.getOriginalBill() != null && 
                                   bill.getOriginalBill().getId().equals(overdueBill.getId()) && 
                                   bill.getBillType() == BillType.LATE_PENALTY)
                    .toList();
                
                if (!existingPenalties.isEmpty()) {
                    System.out.println("ℹ️ [" + java.time.LocalDateTime.now() + "] Hóa đơn #" + overdueBill.getId() + " đã có phạt, bỏ qua");
                    continue;
                }
                
                // 🆕 Gửi thông báo cảnh báo quá hạn trước khi tạo phạt
                System.out.println("📧 [" + java.time.LocalDateTime.now() + "] Gửi cảnh báo cho hóa đơn #" + overdueBill.getId());
                sendOverdueWarningNotificationInternal(overdueBill);
                
                // 🆕 Tạo phạt mới chỉ khi chưa có
                System.out.println("✅ [" + java.time.LocalDateTime.now() + "] Tạo phạt mới cho hóa đơn #" + overdueBill.getId() + " (Loại: " + overdueBill.getBillType() + ")");
                    BillResponse penaltyBill = createLatePenaltyBill(overdueBill.getId());
                    createdPenalties.add(penaltyBill);
                System.out.println("✅ [" + java.time.LocalDateTime.now() + "] Đã tạo phạt #" + penaltyBill.getId() + " cho hóa đơn gốc #" + overdueBill.getId());
                
            } catch (Exception e) {
                System.err.println("❌ [" + java.time.LocalDateTime.now() + "] Lỗi khi tạo phạt cho hóa đơn #" + overdueBill.getId() + ": " + e.getMessage());
                e.printStackTrace();
            }
        }
        
        System.out.println("🎯 [" + java.time.LocalDateTime.now() + "] Hoàn thành: Đã tạo " + createdPenalties.size() + " hóa đơn phạt mới");
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
                            noti.setTitle("⚠️ Cảnh báo hóa đơn quá hạn - Phòng " + contract.getRoom().getRoomNumber());
                            noti.setMessage("Hóa đơn #" + overdueBill.getId() + " đã quá hạn " + overdueDays + " ngày. Số tiền: " + 
                                overdueBill.getTotalAmount().toString() + " VNĐ. Vui lòng thanh toán ngay để tránh bị phạt.");
                            noti.setType(NotificationType.BILL_OVERDUE);
                            noti.setMetadata("{\"billId\":" + overdueBill.getId() + ",\"overdueDays\":" + overdueDays + "}");
                            notificationService.createAndSend(noti);
                        } catch (Exception e) {
                            System.err.println("❌ Lỗi gửi notification cảnh báo cho user " + ru.getUser().getId() + ": " + e.getMessage());
                        }
                        
                        // Gửi email cảnh báo
                        if (ru.getUser().getEmail() != null) {
                            try {
                                String subject = "⚠️ CẢNH BÁO HÓA ĐƠN QUÁ HẠN - Phòng " + contract.getRoom().getRoomNumber();
                                String content = buildOverdueWarningEmailContent(overdueBill, overdueDays);
                                
                                // Tạo PDF hóa đơn gốc
                                byte[] pdfBytes = generateBillPdf(overdueBill.getId());
                                
                                emailService.sendBillWithAttachment(
                                    ru.getUser().getEmail(), 
                                    subject, 
                                    content, 
                                    pdfBytes
                                );
                                
                                System.out.println("✅ Đã gửi email cảnh báo quá hạn cho " + ru.getUser().getEmail());
                            } catch (Exception e) {
                                System.err.println("❌ Lỗi gửi email cảnh báo cho " + ru.getUser().getEmail() + ": " + e.getMessage());
                            }
                        }
                    }
                }
            }
            
            // 2. 🆕 Gửi thông báo cho landlord
            sendLandlordOverdueNotification(overdueBill, overdueDays);
            
        } catch (Exception e) {
            System.err.println("❌ Lỗi trong sendOverdueWarningNotificationInternal: " + e.getMessage());
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
                landlordNoti.setTitle("⚠️ Thông báo hóa đơn quá hạn - Phòng " + overdueBill.getRoom().getRoomNumber());
                landlordNoti.setMessage("Hóa đơn #" + overdueBill.getId() + " của phòng " + overdueBill.getRoom().getRoomNumber() + 
                    " đã quá hạn " + overdueDays + " ngày. Số tiền: " + overdueBill.getTotalAmount().toString() + " VNĐ. " +
                    "Hệ thống sẽ tự động tạo phạt nếu không thanh toán.");
                landlordNoti.setType(NotificationType.BILL_OVERDUE);
                landlordNoti.setMetadata("{\"billId\":" + overdueBill.getId() + ",\"roomNumber\":\"" + overdueBill.getRoom().getRoomNumber() + "\",\"overdueDays\":" + overdueDays + "}");
                notificationService.createAndSend(landlordNoti);
                
                System.out.println("✅ Đã gửi notification cảnh báo quá hạn cho landlord " + landlord.getUsername());
                
                // Gửi email cho landlord
                if (landlord.getEmail() != null) {
                    try {
                        String subject = "⚠️ THÔNG BÁO HÓA ĐƠN QUÁ HẠN - Phòng " + overdueBill.getRoom().getRoomNumber();
                        String content = buildLandlordOverdueEmailContent(overdueBill, overdueDays);
                        
                        emailService.sendBillWithAttachment(
                            landlord.getEmail(), 
                            subject, 
                            content, 
                            null // Không đính kèm PDF cho landlord
                        );
                        
                        System.out.println("✅ Đã gửi email cảnh báo quá hạn cho landlord " + landlord.getEmail());
                    } catch (Exception e) {
                        System.err.println("❌ Lỗi gửi email cảnh báo cho landlord " + landlord.getEmail() + ": " + e.getMessage());
                    }
                }
            }
        } catch (Exception e) {
            System.err.println("❌ Lỗi gửi thông báo cho landlord: " + e.getMessage());
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
        content.append("<li style='margin-bottom: 8px;'>Phạt sẽ tăng dần: Tuần 1 (2%) → Tuần 2 (4%) → Tuần 3 (6%) → ...</li>");
        content.append("</ul>");
        content.append("</div>");
        
        // Khuyến nghị
        content.append("<div style='background-color: #d1ecf1; border: 1px solid #bee5eb; border-radius: 6px; padding: 20px; margin-bottom: 25px;'>");
        content.append("<h3 style='color: #0c5460; margin: 0 0 15px 0; font-size: 18px;'>Khuyến nghị</h3>");
        content.append("<p style='margin: 0; color: #0c5460; font-weight: bold;'>Thanh toán ngay để tránh phạt tăng thêm!</p>");
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
        content.append("<p style='margin: 0; color: #6c757d; font-size: 14px;'>Trân trọng,<br><strong>Hệ thống quản lý tòa nhà</strong></p>");
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
        return originalAmount.multiply(penaltyRate).divide(BigDecimal.valueOf(100), 2, BigDecimal.ROUND_HALF_UP);
    }

    @Override
    public List<Bill> getOverdueBills() {
        Instant now = Instant.now();
        // Tính thời điểm 7 ngày trước để tìm hóa đơn có toDate < (now - 7 days)
        // Điều này tương đương với hóa đơn có (toDate + 7 days) < now
        Instant sevenDaysAgo = now.minusSeconds(7 * 24 * 60 * 60);
        
        System.out.println("🔍 Tìm hóa đơn quá hạn - Thời gian hiện tại: " + now);
        System.out.println("🔍 Tìm hóa đơn có toDate < " + sevenDaysAgo);
        
        List<Bill> overdueBills = billRepository.findByStatusFalseAndToDateBefore(sevenDaysAgo);
        
        System.out.println("📊 Tìm thấy " + overdueBills.size() + " hóa đơn quá hạn:");
        for (Bill bill : overdueBills) {
            int overdueDays = calculateOverdueDays(bill);
            System.out.println("  - Hóa đơn #" + bill.getId() + " - toDate: " + bill.getToDate() + " - Quá hạn: " + overdueDays + " ngày");
        }
        
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
        return (int) daysDiff;
    }

    // Tính toán tỷ lệ phạt dựa trên số ngày quá hạn
    private BigDecimal calculatePenaltyRate(int overdueDays) {
        // Logic phạt chuẩn: 
        // - Tuần đầu tiên (1-7 ngày): 2% 
        // - Tuần thứ 2 (8-14 ngày): 4%
        // - Tuần thứ 3 (15-21 ngày): 6%
        // - Tuần thứ 4 (22-28 ngày): 8%
        // - Từ tuần thứ 5 trở đi: 10%
        
        if (overdueDays <= 0) {
            return BigDecimal.ZERO;
        }
        
        int weeks = (overdueDays - 1) / 7 + 1; // Làm tròn lên
        
        BigDecimal penaltyRate;
        switch (weeks) {
            case 1:
                penaltyRate = BigDecimal.valueOf(2); // 2%
                break;
            case 2:
                penaltyRate = BigDecimal.valueOf(4); // 4%
                break;
            case 3:
                penaltyRate = BigDecimal.valueOf(6); // 6%
                break;
            case 4:
                penaltyRate = BigDecimal.valueOf(8); // 8%
                break;
            default:
                penaltyRate = BigDecimal.valueOf(10); // 10% cho tuần thứ 5 trở đi
                break;
        }
        
        return penaltyRate;
    }

    // Helper method để format số tiền VNĐ
    private String formatCurrency(BigDecimal amount) {
        if (amount == null) return "0 VNĐ";
        return amount.stripTrailingZeros().toPlainString() + " VNĐ";
    }

    // Gửi thông báo và email phạt
    @Transactional
    private void sendPenaltyNotification(Bill penaltyBill) {
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
                    noti.setType(NotificationType.BILL_OVERDUE);
                            noti.setMetadata("{\"billId\":" + penaltyBill.getId() + ",\"originalBillId\":" + originalBill.getId() + ",\"penaltyAmount\":" + penaltyBill.getPenaltyAmount() + "}");
                    notificationService.createAndSend(noti);
                        } catch (Exception e) {
                            System.err.println("❌ Lỗi gửi notification phạt cho user " + ru.getUser().getId() + ": " + e.getMessage());
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
                                
                                System.out.println("✅ Đã gửi email phạt cho " + ru.getUser().getEmail());
                            } catch (Exception e) {
                                System.err.println("❌ Lỗi gửi email phạt cho " + ru.getUser().getEmail() + ": " + e.getMessage());
                            }
                        }
                    }
                }
            }
            
            // 2. 🆕 Gửi thông báo cho landlord
            sendLandlordPenaltyNotification(penaltyBill, originalBill);
            
        } catch (Exception e) {
            System.err.println("❌ Lỗi trong sendPenaltyNotification: " + e.getMessage());
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
                landlordNoti.setType(NotificationType.BILL_OVERDUE);
                landlordNoti.setMetadata("{\"billId\":" + penaltyBill.getId() + ",\"originalBillId\":" + originalBill.getId() + ",\"roomNumber\":\"" + penaltyBill.getRoom().getRoomNumber() + "\",\"penaltyAmount\":" + penaltyBill.getPenaltyAmount() + "}");
                notificationService.createAndSend(landlordNoti);
                
                System.out.println("✅ Đã gửi notification phạt cho landlord " + landlord.getUsername());
                
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
                        
                        System.out.println("✅ Đã gửi email phạt cho landlord " + landlord.getEmail());
                    } catch (Exception e) {
                        System.err.println("❌ Lỗi gửi email phạt cho landlord " + landlord.getEmail() + ": " + e.getMessage());
                    }
                }
            }
        } catch (Exception e) {
            System.err.println("❌ Lỗi gửi thông báo phạt cho landlord: " + e.getMessage());
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
        content.append("<li style='margin-bottom: 8px;'>Tuần 1: 2% | Tuần 2: 4% | Tuần 3: 6% | Tuần 4: 8% | Từ tuần 5: 10%</li>");
        content.append("<li style='margin-bottom: 8px;'>Vui lòng thanh toán sớm để tránh phạt tăng thêm</li>");
        content.append("</ul>");
        content.append("</div>");
        
        // Khuyến nghị
        content.append("<div style='background-color: #d4edda; border: 1px solid #c3e6cb; border-radius: 6px; padding: 20px; margin-bottom: 25px;'>");
        content.append("<h3 style='color: #155724; margin: 0 0 15px 0; font-size: 18px;'>Khuyến nghị</h3>");
        content.append("<p style='margin: 0; color: #155724; font-weight: bold;'>Thanh toán ngay để tránh phạt tăng thêm!</p>");
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

    @Override
    public String buildNormalBillEmailContent(Bill bill, String paymentUrl) {
        StringBuilder content = new StringBuilder();
        content.append("<div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;'>");
        content.append("<div style='background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);'>");
        
        // Header
        content.append("<div style='text-align: center; margin-bottom: 30px;'>");
        content.append("<h1 style='color: #1890ff; margin: 0; font-size: 24px;'>HÓA ĐƠN MỚI</h1>");
        content.append("<div style='width: 60px; height: 3px; background-color: #1890ff; margin: 10px auto;'></div>");
        content.append("</div>");
        
        // Thông tin hóa đơn
        content.append("<div style='background-color: #e6f7ff; border: 1px solid #91d5ff; border-radius: 6px; padding: 20px; margin-bottom: 25px;'>");
        content.append("<h3 style='color: #0050b3; margin: 0 0 15px 0; font-size: 18px;'>Thông tin hóa đơn</h3>");
        content.append("<table style='width: 100%; border-collapse: collapse;'>");
        content.append("<tr><td style='padding: 8px 0; font-weight: bold; color: #333;'>Phòng:</td><td style='padding: 8px 0; color: #666;'>").append(bill.getRoom().getRoomNumber()).append("</td></tr>");
        content.append("<tr><td style='padding: 8px 0; font-weight: bold; color: #333;'>Mã hóa đơn:</td><td style='padding: 8px 0; color: #666;'>#").append(bill.getId()).append("</td></tr>");
        content.append("<tr><td style='padding: 8px 0; font-weight: bold; color: #333;'>Loại hóa đơn:</td><td style='padding: 8px 0; color: #666;'>").append(getBillTypeVietnamese(bill.getBillType())).append("</td></tr>");
        content.append("<tr><td style='padding: 8px 0; font-weight: bold; color: #333;'>Từ ngày:</td><td style='padding: 8px 0; color: #666;'>").append(formatDateTime(bill.getFromDate())).append("</td></tr>");
        content.append("<tr><td style='padding: 8px 0; font-weight: bold; color: #333;'>Đến ngày:</td><td style='padding: 8px 0; color: #666;'>").append(formatDateTime(bill.getToDate())).append("</td></tr>");
        content.append("<tr><td style='padding: 8px 0; font-weight: bold; color: #333;'>Hạn thanh toán:</td><td style='padding: 8px 0; color: #faad14; font-weight: bold;'>").append(formatDateTime(bill.getToDate().plusSeconds(7 * 24 * 60 * 60))).append("</td></tr>");
        content.append("<tr><td style='padding: 8px 0; font-weight: bold; color: #333;'>Số tiền:</td><td style='padding: 8px 0; color: #1890ff; font-weight: bold; font-size: 16px;'>").append(formatCurrency(bill.getTotalAmount())).append("</td></tr>");
        content.append("</table>");
        content.append("</div>");
        
        // Thông báo
        content.append("<div style='background-color: #f6ffed; border: 1px solid #b7eb8f; border-radius: 6px; padding: 20px; margin-bottom: 25px;'>");
        content.append("<h3 style='color: #389e0d; margin: 0 0 15px 0; font-size: 18px;'>Thông báo</h3>");
        content.append("<p style='margin: 0; color: #389e0d;'>Xin chào, vui lòng xem hóa đơn đính kèm.</p>");
        content.append("</div>");
        
        // Thanh toán
        if (paymentUrl != null) {
            content.append("<div style='background-color: #fff7e6; border: 1px solid #ffd591; border-radius: 6px; padding: 20px; margin-bottom: 25px;'>");
            content.append("<h3 style='color: #d46b08; margin: 0 0 15px 0; font-size: 18px;'>Thanh toán</h3>");
            content.append("<p style='margin: 0 0 10px 0; color: #d46b08;'>Để thanh toán hóa đơn, vui lòng bấm vào nút bên dưới:</p>");
            content.append("<div style='text-align: center; margin: 15px 0;'>");
            content.append("<a href='").append(paymentUrl).append("' style='background-color: #1890ff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;'>Thanh toán ngay</a>");
            content.append("</div>");
            content.append("<p style='margin: 10px 0 0 0; color: #d46b08; font-size: 14px;'>Hoặc copy link: <span style='background-color: #f5f5f5; padding: 4px 8px; border-radius: 4px; font-family: monospace; font-size: 12px;'>").append(paymentUrl).append("</span></p>");
            content.append("</div>");
        } else {
            content.append("<div style='background-color: #fff2f0; border: 1px solid #ffccc7; border-radius: 6px; padding: 20px; margin-bottom: 25px;'>");
            content.append("<h3 style='color: #cf1322; margin: 0 0 15px 0; font-size: 18px;'>Lưu ý</h3>");
            content.append("<p style='margin: 0; color: #cf1322;'>Không tạo được link thanh toán tự động. Vui lòng liên hệ quản lý để thanh toán.</p>");
            content.append("</div>");
        }
        
        // Footer
        content.append("<div style='text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6;'>");
        content.append("<p style='margin: 0; color: #6c757d; font-size: 14px;'>Trân trọng,<br><strong>Ban quản lý tòa nhà</strong></p>");
        content.append("</div>");
        
        content.append("</div>");
        content.append("</div>");
        
        return content.toString();
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

}
