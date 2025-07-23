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

@Service
@RequiredArgsConstructor
public class BillServiceImpl implements BillService {

    private final BillRepository billRepository;
    private final ContractRepository contractRepository;
    private final ServiceReadingRepository serviceReadingRepository;
    private final ServiceRepository serviceRepository;
    private final RoomRepository roomRepository;
    private final NotificationService notificationService;

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
                    BigDecimal amount = service.getUnitPrice().multiply(totalConsumed);
                    BillDetail serviceDetail = new BillDetail();
                    serviceDetail.setItemType(BillItemType.SERVICE);
                    serviceDetail.setDescription("Dịch vụ " + service.getServiceName() + " (" + service.getServiceType() + ") từ " + fromDate + " đến " + toDate);
                    serviceDetail.setService(service);
                    serviceDetail.setUnitPriceAtBill(service.getUnitPrice());
                    serviceDetail.setConsumedUnits(totalConsumed);
                    serviceDetail.setItemAmount(amount);
                    serviceDetail.setCreatedDate(Instant.now());
                    details.add(serviceDetail);
                    totalAmount = totalAmount.add(amount);
                }
            } else if (service.getServiceType() == ServiceType.WATER || service.getServiceType() == ServiceType.OTHER) {
                // Nước & dịch vụ khác: tính cố định
                BillDetail fixedDetail = new BillDetail();
                fixedDetail.setItemType(BillItemType.SERVICE);
                fixedDetail.setDescription("Dịch vụ cố định: " + service.getServiceName() + " từ " + fromDate + " đến " + toDate);
                fixedDetail.setService(service);
                fixedDetail.setUnitPriceAtBill(service.getUnitPrice());
                fixedDetail.setItemAmount(service.getUnitPrice());
                fixedDetail.setCreatedDate(Instant.now());
                details.add(fixedDetail);
                totalAmount = totalAmount.add(service.getUnitPrice());
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
                        BigDecimal amount = service.getUnitPrice().multiply(totalConsumed);
                        BillDetail serviceDetail = new BillDetail();
                        serviceDetail.setItemType(BillItemType.SERVICE);
                        serviceDetail.setDescription("Dịch vụ " + service.getServiceName() + " (" + service.getServiceType() + ") từ " + fromDate + " đến " + toDate);
                        serviceDetail.setService(service);
                        serviceDetail.setUnitPriceAtBill(service.getUnitPrice());
                        serviceDetail.setConsumedUnits(totalConsumed);
                        serviceDetail.setItemAmount(amount);
                        serviceDetail.setCreatedDate(Instant.now());
                        details.add(serviceDetail);
                        totalAmount = totalAmount.add(amount);
                    }
                } else if (service.getServiceType() == ServiceType.WATER || service.getServiceType() == ServiceType.OTHER) {
                    BillDetail fixedDetail = new BillDetail();
                    fixedDetail.setItemType(BillItemType.SERVICE);
                    fixedDetail.setDescription("Dịch vụ cố định: " + service.getServiceName() + " từ " + fromDate + " đến " + toDate);
                    fixedDetail.setService(service);
                    fixedDetail.setUnitPriceAtBill(service.getUnitPrice());
                    
                    // Tính toán tiền dịch vụ cố định theo tỷ lệ thời gian
                    BigDecimal serviceAmount;
                    if (isCustomPeriod) {
                        // Với khoảng ngày tùy chọn, tính theo tỷ lệ
                        long daysBetween = ChronoUnit.DAYS.between(fromDate, toDate) + 1;
                        double ratio = daysBetween / 30.0; // Tỷ lệ so với 1 tháng
                        serviceAmount = service.getUnitPrice().multiply(BigDecimal.valueOf(ratio));
                    } else {
                        // Với chu kỳ chuẩn, tính theo số tháng chu kỳ
                        int cycleMonths = countMonths(cycle);
                        serviceAmount = service.getUnitPrice().multiply(BigDecimal.valueOf(cycleMonths));
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
    public BillResponse toResponse(Bill bill) {
        BillResponse response = new BillResponse();
        response.setId(bill.getId());
        response.setContractId(bill.getContract().getId());
        response.setRoomId(bill.getRoom().getId());
        response.setRoomNumber(bill.getRoom().getRoomNumber());
        response.setFromDate(bill.getFromDate());
        response.setToDate(bill.getToDate());
        response.setPaymentCycle(bill.getPaymentCycle());
        response.setBillType(bill.getBillType());
        response.setBillDate(bill.getBillDate());
        response.setDueDate(bill.getDueDate());
        response.setPaidDate(bill.getPaidDate());
        response.setTotalAmount(bill.getTotalAmount());
        response.setStatus(bill.getStatus());

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
                    BigDecimal amount = service.getUnitPrice().multiply(totalConsumed);
                    BillDetailResponse detail = new BillDetailResponse();
                    detail.setItemType(BillItemType.SERVICE);
                    detail.setDescription("Dịch vụ " + service.getServiceName() + " (" + service.getServiceType() + ") tháng " + String.format("%02d/%d", month, year));
                    detail.setServiceName(service.getServiceName());
                    detail.setUnitPriceAtBill(service.getUnitPrice());
                    detail.setConsumedUnits(totalConsumed);
                    detail.setItemAmount(amount);
                    result.add(detail);
                }
            } else if (service.getServiceType() == ServiceType.WATER || service.getServiceType() == ServiceType.OTHER) {
                BillDetailResponse detail = new BillDetailResponse();
                detail.setItemType(BillItemType.SERVICE);
                detail.setDescription("Dịch vụ cố định: " + service.getServiceName() + " tháng " + String.format("%02d/%d", month, year));
                detail.setServiceName(service.getServiceName());
                detail.setUnitPriceAtBill(service.getUnitPrice());
                detail.setItemAmount(service.getUnitPrice());
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
                    BigDecimal amount = service.getUnitPrice().multiply(totalConsumed);
                    BillDetail detail = new BillDetail();
                    detail.setItemType(BillItemType.SERVICE);
                    detail.setDescription("Dịch vụ " + service.getServiceName() + " (" + service.getServiceType() + ") tháng " + String.format("%02d/%d", month, year));
                    detail.setService(service);
                    detail.setUnitPriceAtBill(service.getUnitPrice());
                    detail.setConsumedUnits(totalConsumed);
                    detail.setItemAmount(amount);
                    detail.setCreatedDate(Instant.now());
                    details.add(detail);
                    totalAmount = totalAmount.add(amount);
                }
            } else if (service.getServiceType() == ServiceType.WATER || service.getServiceType() == ServiceType.OTHER) {
                BillDetail detail = new BillDetail();
                detail.setItemType(BillItemType.SERVICE);
                detail.setDescription("Dịch vụ cố định: " + service.getServiceName() + " tháng " + String.format("%02d/%d", month, year));
                detail.setService(service);
                detail.setUnitPriceAtBill(service.getUnitPrice());
                detail.setItemAmount(service.getUnitPrice());
                detail.setCreatedDate(Instant.now());
                details.add(detail);
                totalAmount = totalAmount.add(service.getUnitPrice());
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
                    noti.setType(NotificationType.CUSTOM); // Có thể thêm mới BILL nếu muốn
                    noti.setMetadata("{\"billId\":" + bill.getId() + "}");
                    notificationService.createAndSend(noti);
                }
            }
        }
    }
}
