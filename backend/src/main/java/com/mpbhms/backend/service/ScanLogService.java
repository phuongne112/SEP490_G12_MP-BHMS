package com.mpbhms.backend.service;

import com.mpbhms.backend.entity.ScanLog;
import com.mpbhms.backend.repository.ScanLogRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.Instant;

@Service
public class ScanLogService {
    @Autowired
    private ScanLogRepository scanLogRepository;

    public ScanLog saveLog(String fileName, Long roomId, String result, String errorMessage) {
        ScanLog log = new ScanLog();
        log.setFileName(fileName);
        log.setRoomId(roomId);
        log.setResult(result);
        log.setScanTime(Instant.now());
        log.setErrorMessage(errorMessage);
        return scanLogRepository.save(log);
    }

    public Page<ScanLog> getScanLogs(Pageable pageable) {
        return scanLogRepository.findAll(pageable);
    }
} 