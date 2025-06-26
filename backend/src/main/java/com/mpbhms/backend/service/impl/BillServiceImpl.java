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

@Service
@RequiredArgsConstructor
public class BillServiceImpl implements BillService {

    private final BillRepository billRepository;
    private final ContractRepository contractRepository;
    private final ServiceReadingRepository serviceReadingRepository;
    private final ServiceRepository serviceRepository;
    private final RoomRepository roomRepository;

    @Override
    public Bill generateFirstBill(Long contractId) {
        Contract contract = contractRepository.findById(contractId)
                .orElseThrow(() -> new NotFoundException("Contract not found"));

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
        int expectedMonths = switch (cycle) {
            case MONTHLY -> 1;
            case QUARTERLY -> 3;
            case YEARLY -> 12;
        };
        LocalDate expectedToDate = fromDate.plusMonths(expectedMonths).minusDays(1);
        if (!toDate.equals(expectedToDate)) {
            throw new BusinessException("fromDate/toDate không hợp lệ với chu kỳ thanh toán " + cycle + ". Kỳ đúng phải từ " + fromDate + " đến " + expectedToDate);
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
            if (service.getServiceType() == ServiceType.ELECTRICITY || service.getServiceType() == ServiceType.WATER) {
                // Lấy tất cả reading trong kỳ cho service này
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
            } else if (service.getServiceType() == ServiceType.OTHER) {
                // Dịch vụ cố định
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
        bill.setBillType(BillType.REGULAR);
        bill.setBillDate(Instant.now());
        bill.setTotalAmount(totalAmount);
        bill.setStatus(false);
        bill.setBillDetails(details);

        for (BillDetail detail : details) {
            detail.setBill(bill);
        }

        return billRepository.save(bill);
    }

    @Override
    public Bill generateBill(Long contractId, LocalDate fromDate, LocalDate toDate, BillType billType) {
        Contract contract = contractRepository.findById(contractId)
                .orElseThrow(() -> new NotFoundException("Contract not found"));
        Room room = contract.getRoom();
        PaymentCycle cycle = contract.getPaymentCycle();

        List<BillDetail> details = new ArrayList<>();
        BigDecimal totalAmount = BigDecimal.ZERO;

        // Kiểm tra fromDate/toDate hợp lệ với paymentCycle
        int expectedMonths = switch (cycle) {
            case MONTHLY -> 1;
            case QUARTERLY -> 3;
            case YEARLY -> 12;
        };
        LocalDate expectedToDate = fromDate.plusMonths(expectedMonths).minusDays(1);
        if (!toDate.equals(expectedToDate)) {
            throw new BusinessException("fromDate/toDate không hợp lệ với chu kỳ thanh toán " + cycle + ". Kỳ đúng phải từ " + fromDate + " đến " + expectedToDate);
        }

        // Tiền phòng
        int months = countMonths(cycle);
        BigDecimal rent = BigDecimal.valueOf(room.getPricePerMonth()).multiply(BigDecimal.valueOf(months));
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

        // Nếu là MONTHLY thì mới tính dịch vụ
        if (cycle == PaymentCycle.MONTHLY) {
            for (CustomService service : room.getServices()) {
                if (service.getServiceType() == ServiceType.ELECTRICITY || service.getServiceType() == ServiceType.WATER) {
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
                } else if (service.getServiceType() == ServiceType.OTHER) {
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
        }

        // Tạo Bill (nếu cần lưu DB)
        Bill bill = new Bill();
        bill.setContract(contract);
        bill.setRoom(room);
        bill.setFromDate(fromInstant);
        bill.setToDate(toInstant);
        bill.setPaymentCycle(cycle);
        bill.setBillType(BillType.REGULAR);
        bill.setBillDate(Instant.now());
        bill.setTotalAmount(totalAmount);
        bill.setStatus(false);
        bill.setBillDetails(details);
        for (BillDetail detail : details) {
            detail.setBill(bill);
        }
        billRepository.save(bill);
        return bill;
    }

    private int countMonths(PaymentCycle cycle) {
        return switch (cycle) {
            case MONTHLY -> 1;
            case QUARTERLY -> 3;
            case YEARLY -> 12;
        };
    }

    private LocalDate calculateEndDate(LocalDate startDate, PaymentCycle cycle) {
        return switch (cycle) {
            case MONTHLY -> startDate.plusMonths(1).minusDays(1);
            case QUARTERLY -> startDate.plusMonths(3).minusDays(1);
            case YEARLY -> startDate.plusYears(1).minusDays(1);
        };
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
                .orElseThrow(() -> new NotFoundException("Bill not found"));
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
                .orElseThrow(() -> new NotFoundException("Room not found"));
        ZoneId vnZone = ZoneId.of("Asia/Ho_Chi_Minh");
        LocalDate monthStart = LocalDate.of(year, month, 1);
        LocalDate monthEnd = monthStart.withDayOfMonth(monthStart.lengthOfMonth());
        Instant fromInstant = monthStart.atStartOfDay(vnZone).toInstant();
        Instant toInstant = monthEnd.atTime(23, 59).atZone(vnZone).toInstant();
        List<BillDetailResponse> result = new ArrayList<>();
        for (CustomService service : room.getServices()) {
            if (service.getServiceType() == ServiceType.ELECTRICITY || service.getServiceType() == ServiceType.WATER) {
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
            } else if (service.getServiceType() == ServiceType.OTHER) {
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
                .orElseThrow(() -> new NotFoundException("Room not found"));
        // Lấy contract active của phòng
        Contract contract = contractRepository.findActiveByRoomId(roomId)
                .orElseThrow(() -> new NotFoundException("No active contract for this room"));
        ZoneId vnZone = ZoneId.of("Asia/Ho_Chi_Minh");
        LocalDate monthStart = LocalDate.of(year, month, 1);
        LocalDate monthEnd = monthStart.withDayOfMonth(monthStart.lengthOfMonth());
        Instant fromInstant = monthStart.atStartOfDay(vnZone).toInstant();
        Instant toInstant = monthEnd.atTime(23, 59).atZone(vnZone).toInstant();
        List<BillDetail> details = new ArrayList<>();
        BigDecimal totalAmount = BigDecimal.ZERO;
        for (CustomService service : room.getServices()) {
            if (service.getServiceType() == ServiceType.ELECTRICITY || service.getServiceType() == ServiceType.WATER) {
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
            } else if (service.getServiceType() == ServiceType.OTHER) {
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
        bill.setBillType(BillType.REGULAR);
        bill.setBillDate(Instant.now());
        bill.setTotalAmount(totalAmount);
        bill.setStatus(false);
        bill.setPaymentCycle(contract.getPaymentCycle());
        bill.setBillDetails(details);
        for (BillDetail detail : details) {
            detail.setBill(bill);
        }
        billRepository.save(bill);
        return toResponse(bill);
    }

    @Override
    public void deleteBillById(Long id) {
        Bill bill = billRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Bill not found"));
        if (Boolean.TRUE.equals(bill.getStatus())) {
            throw new BusinessException("Cannot delete a paid bill.");
        }
        billRepository.deleteById(id);
    }

    @Override
    public Page<Bill> filterBills(Long roomId, Boolean status, BigDecimal minPrice, BigDecimal maxPrice, String search, Pageable pageable) {
        Specification<Bill> spec = Specification.where(null);
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
            .orElseThrow(() -> new NotFoundException("Room not found"));
        // Kiểm tra hợp đồng active
        Contract contract = contractRepository.findActiveByRoomId(roomId)
            .orElseThrow(() -> new BusinessException("Room does not have an active contract. Cannot create bill."));

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
        return toResponse(bill);
    }
}
