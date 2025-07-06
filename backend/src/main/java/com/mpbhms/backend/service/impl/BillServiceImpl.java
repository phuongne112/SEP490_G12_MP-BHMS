package com.mpbhms.backend.service.impl;

import com.mpbhms.backend.dto.BillDetailResponse;
import com.mpbhms.backend.dto.BillResponse;
import com.mpbhms.backend.entity.*;
import com.mpbhms.backend.enums.BillItemType;
import com.mpbhms.backend.enums.BillType;
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

        // 4. Dịch vụ của phòng
        List<CustomService> services = room.getServices();
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
        bill.setBillType(BillType.CONTRACT_TOTAL);
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
        // Kiểm tra chu kỳ truyền vào có khớp với hợp đồng không
        if (billType == BillType.CONTRACT_TOTAL && contract.getPaymentCycle() != cycle) {
            throw new BusinessException("Chu kỳ tính hóa đơn không khớp với chu kỳ trong hợp đồng! Chỉ được tạo hóa đơn theo đúng chu kỳ hợp đồng: " + cycle);
        }

        List<BillDetail> details = new ArrayList<>();
        BigDecimal totalAmount = BigDecimal.ZERO;

        int months = countMonths(cycle);
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

            for (CustomService service : room.getServices()) {
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
                    fixedDetail.setItemAmount(service.getUnitPrice());
                    fixedDetail.setCreatedDate(Instant.now());
                    details.add(fixedDetail);
                    totalAmount = totalAmount.add(service.getUnitPrice());
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
        bill.setBillType(billType);
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

        List<BillDetailResponse> detailResponses = bill.getBillDetails().stream().map(detail -> {
            BillDetailResponse d = new BillDetailResponse();
            d.setItemType(detail.getItemType());
            d.setDescription(detail.getDescription());
            d.setUnitPriceAtBill(detail.getUnitPriceAtBill());
            d.setConsumedUnits(detail.getConsumedUnits());
            d.setItemAmount(detail.getItemAmount());
            if (detail.getService() != null) {
                d.setServiceName(detail.getService().getServiceName());
            }
            return d;
        }).toList();

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
        for (CustomService service : room.getServices()) {
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
        for (CustomService service : room.getServices()) {
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
        bill.setBillType(BillType.CONTRACT_TOTAL);
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
    public byte[] generateBillPdf(Long billId) {
        Bill bill = billRepository.findById(billId)
            .orElseThrow(() -> new NotFoundException("Không tìm thấy hóa đơn"));
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        Document document = new Document(PageSize.A4, 50, 50, 50, 50);
        try {
            // Dùng font mặc định
            Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 18);
            Font normalFont = FontFactory.getFont(FontFactory.HELVETICA, 12);
            Font smallBold = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12);
            Font headerFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 14);

            PdfWriter.getInstance(document, baos);
            document.open();

            DateTimeFormatter dateFormatter = DateTimeFormatter.ofPattern("dd/MM/yyyy").withZone(ZoneId.systemDefault());
            DateTimeFormatter dateTimeFormatter = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
            NumberFormat currencyFormat = NumberFormat.getCurrencyInstance(new Locale("vi", "VN"));

            // Header
            Paragraph header = new Paragraph("HOA DON THANH TOAN", titleFont);
            header.setAlignment(Element.ALIGN_CENTER);
            header.setSpacingAfter(20f);
            document.add(header);

            // Thông tin hóa đơn
            document.add(new Paragraph("THONG TIN HOA DON:", headerFont));
            document.add(new Paragraph("Ma hoa don: " + bill.getId(), normalFont));
            document.add(new Paragraph("Loai hoa don: " + bill.getBillType(), normalFont));
            document.add(new Paragraph("Ngay lap: " + dateTimeFormatter.format(bill.getBillDate().atZone(ZoneId.systemDefault())), normalFont));
            document.add(new Paragraph(" "));

            // Thông tin phòng
            document.add(new Paragraph("THONG TIN PHONG:", headerFont));
            document.add(new Paragraph("So phong: " + bill.getRoom().getRoomNumber(), normalFont));
            if (bill.getRoom().getBuilding() != null && !bill.getRoom().getBuilding().isEmpty()) {
                document.add(new Paragraph("Toa nha: " + bill.getRoom().getBuilding(), normalFont));
            }
            document.add(new Paragraph(" "));

            // Thông tin hợp đồng
            if (bill.getContract() != null) {
                document.add(new Paragraph("THONG TIN HOP DONG:", headerFont));
                document.add(new Paragraph("Ma hop dong: " + bill.getContract().getId(), normalFont));
                document.add(new Paragraph("Chu ky thanh toan: " + bill.getContract().getPaymentCycle(), normalFont));
                document.add(new Paragraph(" "));
            }

            // Thông tin người thuê
            if (bill.getContract() != null && bill.getContract().getRoomUsers() != null) {
                document.add(new Paragraph("NGUOI THUE:", headerFont));
                for (RoomUser roomUser : bill.getContract().getRoomUsers()) {
                    if (roomUser.getUser() != null && roomUser.getUser().getUserInfo() != null) {
                        document.add(new Paragraph("- " + roomUser.getUser().getUserInfo().getFullName() + 
                            " (SDT: " + roomUser.getUser().getUserInfo().getPhoneNumber() + ")", normalFont));
                    }
                }
                document.add(new Paragraph(" "));
            }

            // Thời gian tính tiền
            document.add(new Paragraph("THOI GIAN TINH TIEN:", headerFont));
            document.add(new Paragraph("Tu ngay: " + dateFormatter.format(bill.getFromDate().atZone(ZoneId.systemDefault())), normalFont));
            document.add(new Paragraph("Den ngay: " + dateFormatter.format(bill.getToDate().atZone(ZoneId.systemDefault())), normalFont));
            document.add(new Paragraph(" "));

            // Chi tiết hóa đơn
            document.add(new Paragraph("CHI TIET HOA DON:", headerFont));
            BigDecimal totalAmount = BigDecimal.ZERO;
            for (BillDetail detail : bill.getBillDetails()) {
                String detailText = detail.getDescription();
                if (detail.getConsumedUnits() != null) {
                    detailText += " (So luong: " + detail.getConsumedUnits() + ")";
                }
                if (detail.getUnitPriceAtBill() != null) {
                    detailText += " - Don gia: " + currencyFormat.format(detail.getUnitPriceAtBill());
                }
                if (detail.getItemAmount() != null) {
                    detailText += " - Thanh tien: " + currencyFormat.format(detail.getItemAmount());
                    totalAmount = totalAmount.add(detail.getItemAmount());
                }
                document.add(new Paragraph(detailText, normalFont));
            }
            document.add(new Paragraph(" "));

            // Tổng tiền
            document.add(new Paragraph("TONG CONG: " + currencyFormat.format(totalAmount), smallBold));
            document.add(new Paragraph(" "));

            // Trạng thái thanh toán
            String status = bill.getStatus() ? "DA THANH TOAN" : "CHUA THANH TOAN";
            document.add(new Paragraph("Trang thai: " + status, smallBold));

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
