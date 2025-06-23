package com.mpbhms.backend.service;

import com.mpbhms.backend.dto.ContractDTO;
import com.mpbhms.backend.dto.ResultPaginationDTO;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

// ContractService.java
public interface ContractService {
    byte[] generateContractPdf(Long contractId);

    ResultPaginationDTO getAllContracts(Specification spec, Pageable pageable);
    ContractDTO updateContract(ContractDTO contractDTO);
    void deleteContract(Long id);
    ContractDTO createContract(ContractDTO contractDTO);
}

