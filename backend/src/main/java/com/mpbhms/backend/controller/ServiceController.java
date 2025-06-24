package com.mpbhms.backend.controller;

import com.mpbhms.backend.dto.CreateServiceRequest;
import com.mpbhms.backend.dto.ResultPaginationDTO;
import com.mpbhms.backend.dto.ServiceDTO;
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

import java.util.List;

@RestController
@RequestMapping("/mpbhms/services")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ServiceController {

    private final ServiceService serviceService;

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
    public ResponseEntity<CustomService> getServiceById(@PathVariable Long id) {
        CustomService service = serviceService.getServiceById(id);
        return ResponseEntity.ok(service);
    }

    @PostMapping
    public ResponseEntity<CustomService> createService(@Valid @RequestBody CreateServiceRequest request) {
        CustomService service = new CustomService();
        service.setServiceName(request.getServiceName());
        service.setUnit(request.getUnit());
        service.setUnitPrice(request.getUnitPrice());
        service.setServiceType(request.getServiceType());
        
        CustomService createdService = serviceService.createService(service);
        return ResponseEntity.ok(createdService);
    }

    @PutMapping("/{id}")
    public ResponseEntity<CustomService> updateService(@PathVariable Long id, @Valid @RequestBody CreateServiceRequest request) {
        CustomService service = new CustomService();
        service.setId(id);
        service.setServiceName(request.getServiceName());
        service.setUnit(request.getUnit());
        service.setUnitPrice(request.getUnitPrice());
        service.setServiceType(request.getServiceType());
        
        CustomService updatedService = serviceService.updateService(service);
        return ResponseEntity.ok(updatedService);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteService(@PathVariable Long id) {
        serviceService.deleteService(id);
        return ResponseEntity.noContent().build();
    }
} 