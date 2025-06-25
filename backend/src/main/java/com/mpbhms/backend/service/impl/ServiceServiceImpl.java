package com.mpbhms.backend.service.impl;

import com.mpbhms.backend.dto.Meta;
import com.mpbhms.backend.dto.ResultPaginationDTO;
import com.mpbhms.backend.dto.ServiceDTO;
import com.mpbhms.backend.entity.CustomService;
import com.mpbhms.backend.exception.BusinessException;
import com.mpbhms.backend.exception.IdInvalidException;
import com.mpbhms.backend.exception.NotFoundException;
import com.mpbhms.backend.repository.ServiceRepository;
import com.mpbhms.backend.repository.ServiceReadingRepository;
import com.mpbhms.backend.entity.ServiceReading;
import com.mpbhms.backend.service.ServiceService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;
import java.math.BigDecimal;
import java.time.Instant;

@Service
@RequiredArgsConstructor
public class ServiceServiceImpl implements ServiceService {

    private final ServiceRepository serviceRepository;
    private final ServiceReadingRepository serviceReadingRepository;

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
            throw new IdInvalidException("Service ID cannot be null");
        }
        
        if (!serviceRepository.existsById(service.getId())) {
            throw new NotFoundException("Service not found with id: " + service.getId());
        }
        
        return serviceRepository.save(service);
    }

    @Override
    public void deleteService(Long id) {
        if (id == null) {
            throw new IdInvalidException("Service ID cannot be null");
        }
        
        if (!serviceRepository.existsById(id)) {
            throw new NotFoundException("Service not found with id: " + id);
        }
        
        serviceRepository.deleteById(id);
    }

    @Override
    public CustomService getServiceById(Long id) {
        if (id == null) {
            throw new IdInvalidException("Service ID cannot be null");
        }
        
        return serviceRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Service not found with id: " + id));
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
} 