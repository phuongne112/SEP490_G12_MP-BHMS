package com.mpbhms.backend.repository;

import com.mpbhms.backend.entity.ScanLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ScanLogRepository extends JpaRepository<ScanLog, Long> {
} 