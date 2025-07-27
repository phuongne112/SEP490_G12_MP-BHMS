package com.mpbhms.backend.controller;

import com.mpbhms.backend.dto.CreateServiceRequest;
import com.mpbhms.backend.dto.ResultPaginationDTO;
import com.mpbhms.backend.dto.ServiceDTO;
import com.mpbhms.backend.dto.ServicePriceHistoryDTO;
import com.mpbhms.backend.dto.UpdateServicePriceRequest;
import com.mpbhms.backend.entity.CustomService;
import com.mpbhms.backend.service.ServiceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.turkraft.springfilter.boot.Filter;
import com.mpbhms.backend.repository.ServiceReadingRepository;
import com.mpbhms.backend.entity.ServiceReading;
import org.springframework.beans.factory.annotation.Autowired;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/mpbhms/services")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ServiceController {

    private final ServiceService serviceService;
    @Autowired
    private ServiceReadingRepository serviceReadingRepository;

    @GetMapping
    public ResponseEntity<ResultPaginationDTO> getAllServices(
            @Filter Specification<CustomService> spec,
            Pageable pageable
    ) {
        ResultPaginationDTO result = serviceService.getAllServices(spec, pageable);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/all")
    public ResponseEntity<List<ServiceDTO>> getAllServicesList() {
        List<ServiceDTO> services = serviceService.getAllServices();
        return ResponseEntity.ok(services);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ServiceDTO> getServiceById(@PathVariable Long id) {
        CustomService service = serviceService.getServiceById(id);
        ServiceDTO dto = mapToDTO(service);
        return ResponseEntity.ok(dto);
    }

    @PostMapping
    public ResponseEntity<ServiceDTO> createService(@Valid @RequestBody CreateServiceRequest request) {
        CustomService service = new CustomService();
        service.setServiceName(request.getServiceName());
        service.setUnit(request.getUnit());
        service.setUnitPrice(request.getUnitPrice());
        service.setServiceType(request.getServiceType());
        CustomService createdService = serviceService.createService(service);
        ServiceDTO dto = mapToDTO(createdService);
        return ResponseEntity.ok(dto);
    }

    @PutMapping("/{id}")
    public ResponseEntity<ServiceDTO> updateService(@PathVariable Long id, @Valid @RequestBody CreateServiceRequest request) {
        CustomService service = new CustomService();
        service.setId(id);
        service.setServiceName(request.getServiceName());
        service.setUnit(request.getUnit());
        service.setUnitPrice(request.getUnitPrice());
        service.setServiceType(request.getServiceType());
        CustomService updatedService = serviceService.updateService(service);
        ServiceDTO dto = mapToDTO(updatedService);
        return ResponseEntity.ok(dto);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteService(@PathVariable Long id) {
        serviceService.deleteService(id);
        return ResponseEntity.noContent().build();
    }

    private ServiceDTO mapToDTO(CustomService service) {
        if (service == null) return null;
        ServiceDTO dto = new ServiceDTO();
        dto.setId(service.getId());
        dto.setServiceName(service.getServiceName());
        dto.setUnit(service.getUnit());
        dto.setUnitPrice(service.getUnitPrice());
        dto.setServiceType(service.getServiceType() != null ? service.getServiceType().name() : null);
        return dto;
    }

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

    @GetMapping("/readings")
    public List<ServiceReadingDTO> getServiceReadingsByServiceId(
        @RequestParam Long serviceId,
        @RequestParam(required = false) Long roomId,
        @RequestParam(required = false) String startDate, // yyyy-MM-dd
        @RequestParam(required = false) String endDate // yyyy-MM-dd
    ) {
        List<ServiceReading> readings;
        if (startDate != null && endDate != null) {
            LocalDate fromDate = LocalDate.parse(startDate);
            LocalDate toDate = LocalDate.parse(endDate);
            Instant from = fromDate.atStartOfDay(ZoneId.systemDefault()).toInstant();
            Instant to = toDate.plusDays(1).atStartOfDay(ZoneId.systemDefault()).toInstant();
            if (roomId != null) {
                readings = serviceReadingRepository.findByServiceIdAndRoomIdAndDateRange(serviceId, roomId, from, to);
            } else {
                readings = serviceReadingRepository.findByServiceIdAndDateRange(serviceId, from, to);
            }
        } else {
            if (roomId != null) {
                readings = serviceReadingRepository.findByServiceIdAndRoomId(serviceId, roomId);
            } else {
                readings = serviceReadingRepository.findByService_Id(serviceId);
            }
        }
        return readings.stream()
            .map(sr -> new ServiceReadingDTO(
                sr.getId(),
                sr.getRoom() != null ? sr.getRoom().getId() : null,
                sr.getRoom() != null ? sr.getRoom().getRoomNumber() : null,
                sr.getOldReading(),
                sr.getNewReading(),
                sr.getService() != null ? sr.getService().getId() : null,
                sr.getCreatedDate()
            ))
            .collect(Collectors.toList());
    }

    // Thêm endpoints cho quản lý lịch sử giá
    @PutMapping("/{id}/price")
    public ResponseEntity<ServicePriceHistoryDTO> updateServicePrice(
            @PathVariable Long id, 
            @Valid @RequestBody UpdateServicePriceRequest request) {
        ServicePriceHistoryDTO result = serviceService.updateServicePrice(id, request);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/{id}/price-history")
    public ResponseEntity<List<ServicePriceHistoryDTO>> getServicePriceHistory(@PathVariable Long id) {
        List<ServicePriceHistoryDTO> history = serviceService.getServicePriceHistory(id);
        return ResponseEntity.ok(history);
    }

    @GetMapping("/{id}/price-at-date")
    public ResponseEntity<BigDecimal> getServicePriceAtDate(
            @PathVariable Long id, 
            @RequestParam String date) {
        LocalDate targetDate = LocalDate.parse(date);
        BigDecimal price = serviceService.getServicePriceAtDate(id, targetDate);
        return ResponseEntity.ok(price);
    }

    @DeleteMapping("/price-history/{historyId}")
    public ResponseEntity<Void> deleteServicePriceHistory(@PathVariable Long historyId) {
        serviceService.deleteServicePriceHistory(historyId);
        return ResponseEntity.noContent().build();
    }
} 