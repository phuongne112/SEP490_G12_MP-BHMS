package com.mpbhms.backend.service;

import com.mpbhms.backend.dto.ResultPaginationDTO;
import com.mpbhms.backend.dto.ServiceDTO;
import com.mpbhms.backend.entity.CustomService;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

import java.util.List;

public interface ServiceService {
    List<ServiceDTO> getAllServices();
    ResultPaginationDTO getAllServices(Specification<CustomService> spec, Pageable pageable);
    CustomService createService(CustomService service);
    CustomService updateService(CustomService service);
    void deleteService(Long id);
    CustomService getServiceById(Long id);
    boolean existsById(Long id);
} 