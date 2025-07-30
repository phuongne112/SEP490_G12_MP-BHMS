package com.mpbhms.backend.service.impl;

import com.mpbhms.backend.dto.Meta;
import com.mpbhms.backend.dto.NotificationDTO;
import com.mpbhms.backend.dto.ResultPaginationDTO;
import com.mpbhms.backend.dto.ServiceDTO;
import com.mpbhms.backend.dto.ServicePriceHistoryDTO;
import com.mpbhms.backend.dto.UpdateServicePriceRequest;
import com.mpbhms.backend.entity.Contract;
import com.mpbhms.backend.entity.CustomService;
import com.mpbhms.backend.entity.RoomUser;
import com.mpbhms.backend.entity.ServicePriceHistory;
import com.mpbhms.backend.enums.ContractStatus;
import com.mpbhms.backend.enums.NotificationType;
import com.mpbhms.backend.exception.BusinessException;
import com.mpbhms.backend.exception.IdInvalidException;
import com.mpbhms.backend.exception.NotFoundException;
import com.mpbhms.backend.repository.ContractRepository;
import com.mpbhms.backend.repository.ServicePriceHistoryRepository;
import com.mpbhms.backend.repository.ServiceReadingRepository;
import com.mpbhms.backend.repository.ServiceRepository;
import com.mpbhms.backend.entity.ServiceReading;
import com.mpbhms.backend.service.NotificationService;
import com.mpbhms.backend.service.ServiceService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ServiceServiceImpl implements ServiceService {

    private final ServiceRepository serviceRepository;
    private final ServiceReadingRepository serviceReadingRepository;
    private final ServicePriceHistoryRepository servicePriceHistoryRepository;
    private final ContractRepository contractRepository;
    private final NotificationService notificationService;

    @Override
    public List<ServiceDTO> getAllServices() {
        List<CustomService> services = serviceRepository.findAll();
        return services.stream()
                .map(this::convertToServiceDTO)
                .collect(Collectors.toList());
    }

    @Override
    public ResultPaginationDTO getAllServices(Specification<CustomService> spec, Pageable pageable) {
        Page<CustomService> servicePage = serviceRepository.findAll(spec, pageable);
        
        List<ServiceDTO> serviceDTOs = servicePage.getContent().stream()
                .map(this::convertToServiceDTO)
                .collect(Collectors.toList());

        Meta meta = new Meta();
        meta.setPage(pageable.getPageNumber() + 1);
        meta.setPageSize(pageable.getPageSize());
        meta.setTotal(servicePage.getTotalElements());
        meta.setPages(servicePage.getTotalPages());

        ResultPaginationDTO result = new ResultPaginationDTO();
        result.setResult(serviceDTOs);
        result.setMeta(meta);
        
        return result;
    }

    @Override
    public CustomService createService(CustomService service) {
        return serviceRepository.save(service);
    }

    @Override
    public CustomService updateService(CustomService service) {
        if (service.getId() == null) {
            throw new IdInvalidException("ID dịch vụ không được để trống");
        }
        
        if (!serviceRepository.existsById(service.getId())) {
            throw new NotFoundException("Không tìm thấy dịch vụ với ID: " + service.getId());
        }
        
        return serviceRepository.save(service);
    }

    @Override
    public void deleteService(Long id) {
        if (id == null) {
            throw new IdInvalidException("ID dịch vụ không được để trống");
        }
        
        CustomService service = getServiceById(id);
        
        // Kiểm tra xem dịch vụ có lịch sử giá không
        List<ServicePriceHistory> priceHistories = servicePriceHistoryRepository.findByServiceIdOrderByEffectiveDateDesc(id);
        if (!priceHistories.isEmpty()) {
            throw new BusinessException("Không thể xóa dịch vụ đã có lịch sử giá. Vui lòng xóa lịch sử giá trước.");
        }
        
        // Kiểm tra xem dịch vụ có đang được sử dụng trong phòng nào không
        List<ServiceReading> serviceReadings = serviceReadingRepository.findByService_Id(id);
        if (!serviceReadings.isEmpty()) {
            throw new BusinessException("Không thể xóa dịch vụ đang được sử dụng trong phòng. Vui lòng gỡ bỏ dịch vụ khỏi phòng trước.");
        }
        
        // Kiểm tra xem dịch vụ có đang được sử dụng trong hóa đơn nào không
        // TODO: Thêm kiểm tra với bảng bill_detail nếu có
        
        serviceRepository.deleteById(id);
    }

    @Override
    public CustomService getServiceById(Long id) {
        if (id == null) {
            throw new IdInvalidException("ID dịch vụ không được để trống");
        }
        
        return serviceRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy dịch vụ với ID: " + id));
    }

    @Override
    public boolean existsById(Long id) {
        if (id == null) {
            return false;
        }
        return serviceRepository.existsById(id);
    }

    @Override
    public java.util.List<ServiceReadingDTO> getServiceReadingsByServiceId(Long serviceId) {
        return serviceReadingRepository.findByService_Id(serviceId)
            .stream()
            .map(sr -> new ServiceReadingDTO(
                sr.getId(),
                sr.getRoom() != null ? sr.getRoom().getId() : null,
                sr.getRoom() != null ? sr.getRoom().getRoomNumber() : null,
                sr.getOldReading(),
                sr.getNewReading(),
                sr.getService() != null ? sr.getService().getId() : null,
                sr.getCreatedDate()
            ))
            .collect(java.util.stream.Collectors.toList());
    }

    private ServiceDTO convertToServiceDTO(CustomService service) {
        ServiceDTO dto = new ServiceDTO();
        dto.setId(service.getId());
        dto.setServiceName(service.getServiceName());
        dto.setUnit(service.getUnit());
        dto.setUnitPrice(service.getUnitPrice());
        dto.setServiceType(service.getServiceType().name());
        return dto;
    }

    @Override
    public ServicePriceHistoryDTO updateServicePrice(Long serviceId, UpdateServicePriceRequest request) {
        CustomService service = getServiceById(serviceId);
        
        LocalDate today = LocalDate.now();
        LocalDate fiveDaysFromNow = today.plusDays(5);
        
        // Kiểm tra ngày hiệu lực không được trong quá khứ và phải cách ngày hiện tại ít nhất 5 ngày
        if (request.getEffectiveDate().isBefore(today)) {
            throw new BusinessException("Ngày hiệu lực không được trong quá khứ");
        }
        
        if (request.getEffectiveDate().isBefore(fiveDaysFromNow)) {
            throw new BusinessException("Ngày hiệu lực phải cách ngày hiện tại ít nhất 5 ngày");
        }
        
        // Tạo lịch sử giá mới (chưa active)
        ServicePriceHistory priceHistory = new ServicePriceHistory();
        priceHistory.setService(service);
        priceHistory.setUnitPrice(request.getNewUnitPrice());
        priceHistory.setEffectiveDate(request.getEffectiveDate());
        priceHistory.setEndDate(null); // Giá mới chưa có ngày kết thúc
        priceHistory.setReason(request.getReason());
        priceHistory.setIsActive(false); // Chưa active, sẽ active khi đến ngày hiệu lực
        
        // KHÔNG cập nhật giá hiện tại của service ngay lập tức
        // Giá sẽ được cập nhật khi đến ngày hiệu lực thông qua job tự động
        
        ServicePriceHistory savedHistory = servicePriceHistoryRepository.save(priceHistory);
        
        // Gửi thông báo cho tất cả người thuê về việc sắp thay đổi giá dịch vụ
        sendServicePriceChangeNotification(service, savedHistory);
        
        return convertToServicePriceHistoryDTO(savedHistory);
    }

    @Override
    public List<ServicePriceHistoryDTO> getServicePriceHistory(Long serviceId) {
        List<ServicePriceHistory> histories = servicePriceHistoryRepository.findByServiceIdOrderByEffectiveDateDesc(serviceId);
        return histories.stream()
                .map(this::convertToServicePriceHistoryDTO)
                .collect(Collectors.toList());
    }

    @Override
    public BigDecimal getServicePriceAtDate(Long serviceId, LocalDate date) {
        ServicePriceHistory priceHistory = servicePriceHistoryRepository.findActivePriceByServiceAndDate(serviceId, date)
                .orElse(null);
        
        if (priceHistory != null) {
            return priceHistory.getUnitPrice();
        }
        
        // Nếu không có lịch sử giá, trả về giá hiện tại
        CustomService service = getServiceById(serviceId);
        return service.getUnitPrice();
    }

    @Override
    public void deleteServicePriceHistory(Long historyId) {
        if (historyId == null) {
            throw new IdInvalidException("ID lịch sử giá không được để trống");
        }
        
        ServicePriceHistory history = servicePriceHistoryRepository.findById(historyId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy lịch sử giá với ID: " + historyId));
        
        // Chỉ cho phép xóa lịch sử giá chưa active (chưa áp dụng)
        if (history.getIsActive()) {
            throw new BusinessException("Không thể xóa lịch sử giá đang được áp dụng");
        }
        
        servicePriceHistoryRepository.deleteById(historyId);
    }

    private ServicePriceHistoryDTO convertToServicePriceHistoryDTO(ServicePriceHistory history) {
        ServicePriceHistoryDTO dto = new ServicePriceHistoryDTO();
        dto.setId(history.getId());
        dto.setServiceId(history.getService().getId());
        dto.setServiceName(history.getService().getServiceName());
        dto.setUnitPrice(history.getUnitPrice());
        dto.setEffectiveDate(history.getEffectiveDate());
        dto.setEndDate(history.getEndDate());
        dto.setReason(history.getReason());
        dto.setIsActive(history.getIsActive());
        dto.setCreatedAt(history.getCreatedDate().atZone(java.time.ZoneId.systemDefault()).toLocalDate());
        return dto;
    }

    /**
     * Gửi thông báo cho tất cả người thuê về việc sắp thay đổi giá dịch vụ
     */
    private void sendServicePriceChangeNotification(CustomService service, ServicePriceHistory newPrice) {
        try {
            // Tìm tất cả hợp đồng đang active
            List<Contract> activeContracts = contractRepository.findByContractStatus(ContractStatus.ACTIVE);
            
            for (Contract contract : activeContracts) {
                if (contract.getRoomUsers() != null) {
                    for (RoomUser roomUser : contract.getRoomUsers()) {
                        if (roomUser.getUser() != null && Boolean.TRUE.equals(roomUser.getIsActive())) {
                            try {
                                NotificationDTO notification = new NotificationDTO();
                                notification.setRecipientId(roomUser.getUser().getId());
                                notification.setTitle("Thông báo thay đổi giá dịch vụ: " + service.getServiceName());
                                notification.setMessage(String.format(
                                    "Giá dịch vụ %s sẽ được cập nhật thành %s VNĐ/%s từ ngày %s. " +
                                    "Lý do: %s",
                                    service.getServiceName(),
                                    newPrice.getUnitPrice().toString(),
                                    service.getUnit(),
                                    newPrice.getEffectiveDate().format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy")),
                                    newPrice.getReason() != null ? newPrice.getReason() : "Không có lý do"
                                ));
                                notification.setType(NotificationType.SERVICE_UPDATE);
                                notification.setMetadata(String.format(
                                    "{\"serviceId\":%d,\"serviceName\":\"%s\",\"newPrice\":%s,\"effectiveDate\":\"%s\"}",
                                    service.getId(),
                                    service.getServiceName(),
                                    newPrice.getUnitPrice().toString(),
                                    newPrice.getEffectiveDate().toString()
                                ));
                                
                                notificationService.createAndSend(notification);
                            } catch (Exception e) {
                                System.err.println("Lỗi gửi thông báo thay đổi giá dịch vụ cho user " + roomUser.getUser().getId() + ": " + e.getMessage());
                            }
                        }
                    }
                }
            }
        } catch (Exception e) {
            System.err.println("Lỗi khi gửi thông báo thay đổi giá dịch vụ: " + e.getMessage());
        }
    }
} 