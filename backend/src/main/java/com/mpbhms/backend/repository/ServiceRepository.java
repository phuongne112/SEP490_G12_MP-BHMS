package com.mpbhms.backend.repository;

import com.mpbhms.backend.entity.CustomService;
import com.mpbhms.backend.enums.ServiceType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

@Repository
public interface ServiceRepository extends JpaRepository<CustomService, Long>, JpaSpecificationExecutor<CustomService> {
    CustomService findByServiceType(ServiceType serviceType);
    boolean existsByServiceName(String serviceName);
}
