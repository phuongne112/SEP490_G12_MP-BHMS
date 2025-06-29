package com.mpbhms.backend.service;

import com.mpbhms.backend.dto.CreateScheduleRequest;
import com.mpbhms.backend.dto.ScheduleDTO;
import com.mpbhms.backend.enums.ScheduleStatus;
import com.mpbhms.backend.dto.ResultPaginationDTO;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface ScheduleService {
    ScheduleDTO createSchedule(CreateScheduleRequest request);
    List<ScheduleDTO> getAllSchedules();
    ScheduleDTO getSchedule(Long id);
    ScheduleDTO updateStatus(Long id, ScheduleStatus status);
    void deleteSchedule(Long id);
    List<ScheduleDTO> getSchedulesByLandlord(Long landlordId);
    ResultPaginationDTO getSchedulesByLandlordPaged(Long landlordId, String email, String fullName, Pageable pageable);
} 