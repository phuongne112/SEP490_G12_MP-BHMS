package com.mpbhms.backend.repository;

import com.mpbhms.backend.entity.CustomService;
import com.mpbhms.backend.enums.ServiceType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ServiceRepository extends JpaRepository<CustomService, Long> {
    CustomService findByServiceType(ServiceType serviceType);
}
