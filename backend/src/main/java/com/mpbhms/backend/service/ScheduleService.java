package com.mpbhms.backend.service;

import com.mpbhms.backend.dto.CreateScheduleRequest;
import com.mpbhms.backend.dto.ScheduleDTO;
import com.mpbhms.backend.enums.ScheduleStatus;
import com.mpbhms.backend.dto.ResultPaginationDTO;

import java.util.List;
import java.time.Instant;

public interface ScheduleService {
    ScheduleDTO createSchedule(CreateScheduleRequest request);
    List<ScheduleDTO> getAllSchedules();
    ScheduleDTO getSchedule(Long id);
    ScheduleDTO updateStatus(Long id, ScheduleStatus status);
    ScheduleDTO updateSchedule(Long id, CreateScheduleRequest request);
    void deleteSchedule(Long id);
    List<ScheduleDTO> getSchedulesByLandlord(Long landlordId);
    ResultPaginationDTO searchAndFilter(Long landlordId, String search, ScheduleStatus status, Instant from, Instant to, int page, int pageSize);
    List<ScheduleDTO> getSchedulesByRenter(Long renterId);
    List<ScheduleDTO> getSchedulesByEmail(String email);
} 