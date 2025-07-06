package com.mpbhms.backend.repository;

import com.mpbhms.backend.entity.ContractAmendment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ContractAmendmentRepository extends JpaRepository<ContractAmendment, Long> {
    
    // Tìm tất cả amendment của một hợp đồng
    List<ContractAmendment> findByContractIdOrderByCreatedDateDesc(Long contractId);
    
    // Tìm amendment đang pending
    List<ContractAmendment> findByContractIdAndStatus(Long contractId, ContractAmendment.AmendmentStatus status);
    
    // Tìm amendment theo loại
    List<ContractAmendment> findByContractIdAndAmendmentType(Long contractId, ContractAmendment.AmendmentType amendmentType);
    
    // Tìm amendment cần approval
    List<ContractAmendment> findByRequiresApprovalTrueAndStatus(ContractAmendment.AmendmentStatus status);
    
    // Tìm amendment theo status (cho scheduled job auto-approve)
    List<ContractAmendment> findByStatus(ContractAmendment.AmendmentStatus status);
} 