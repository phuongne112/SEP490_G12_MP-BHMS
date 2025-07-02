package com.mpbhms.backend.repository;

import com.mpbhms.backend.entity.ContractLandlordInfo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ContractLandlordInfoRepository extends JpaRepository<ContractLandlordInfo, Long> {
    List<ContractLandlordInfo> findByContractId(Long contractId);
} 