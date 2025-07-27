package com.mpbhms.backend.service;

import com.mpbhms.backend.dto.ResultPaginationDTO;
import com.mpbhms.backend.dto.ServiceDTO;
import com.mpbhms.backend.dto.ServicePriceHistoryDTO;
import com.mpbhms.backend.dto.UpdateServicePriceRequest;
import com.mpbhms.backend.entity.CustomService;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.Instant;
import java.util.List;

public interface ServiceService {
    List<ServiceDTO> getAllServices();
    ResultPaginationDTO getAllServices(Specification<CustomService> spec, Pageable pageable);
    CustomService createService(CustomService service);
    CustomService updateService(CustomService service);
    void deleteService(Long id);
    CustomService getServiceById(Long id);
    boolean existsById(Long id);

    // Thêm method cho readings
    List<ServiceReadingDTO> getServiceReadingsByServiceId(Long serviceId);

    // Thêm methods cho quản lý lịch sử giá
    ServicePriceHistoryDTO updateServicePrice(Long serviceId, UpdateServicePriceRequest request);
    List<ServicePriceHistoryDTO> getServicePriceHistory(Long serviceId);
    BigDecimal getServicePriceAtDate(Long serviceId, LocalDate date);
    void deleteServicePriceHistory(Long historyId);

    class ServiceReadingDTO {
        public Long id;
        public Long roomId;
        public String roomNumber;
        public BigDecimal oldReading;
        public BigDecimal newReading;
        public Long serviceId;
        public Instant createdDate;
        public ServiceReadingDTO(Long id, Long roomId, String roomNumber, BigDecimal oldReading, BigDecimal newReading, Long serviceId, Instant createdDate) {
            this.id = id;
            this.roomId = roomId;
            this.roomNumber = roomNumber;
            this.oldReading = oldReading;
            this.newReading = newReading;
            this.serviceId = serviceId;
            this.createdDate = createdDate;
        }
    }
} 