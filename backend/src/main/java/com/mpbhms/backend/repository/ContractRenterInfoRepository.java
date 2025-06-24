package com.mpbhms.backend.repository;

import com.mpbhms.backend.entity.ContractRenterInfo;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
 
public interface ContractRenterInfoRepository extends JpaRepository<ContractRenterInfo, Long> {
    List<ContractRenterInfo> findByContractId(Long contractId);
} 