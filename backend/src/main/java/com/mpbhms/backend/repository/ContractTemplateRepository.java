package com.mpbhms.backend.repository;

import com.mpbhms.backend.entity.ContractTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ContractTemplateRepository extends JpaRepository<ContractTemplate, Long> {
    List<ContractTemplate> findByLandlordId(Long landlordId);
    ContractTemplate findByLandlordIdAndIsDefaultTrue(Long landlordId);
} 