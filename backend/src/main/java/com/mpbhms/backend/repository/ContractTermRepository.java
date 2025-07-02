package com.mpbhms.backend.repository;

import com.mpbhms.backend.entity.ContractTerm;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ContractTermRepository extends JpaRepository<ContractTerm, Long> {
} 