package com.mpbhms.backend.repository;

import com.mpbhms.backend.entity.Contract;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ContractRepository extends JpaRepository<Contract, Long>, JpaSpecificationExecutor<Contract> {
    @Query("SELECT c FROM Contract c WHERE c.room.id = :roomId AND c.contractStatus = 'ACTIVE'")
    java.util.Optional<Contract> findActiveByRoomId(@Param("roomId") Long roomId);
    
    List<Contract> findByRoomId(Long roomId);
}