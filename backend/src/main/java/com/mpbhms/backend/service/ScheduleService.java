package com.mpbhms.backend.service;

import com.mpbhms.backend.dto.CreateScheduleRequest;
import com.mpbhms.backend.dto.ScheduleDTO;
import com.mpbhms.backend.enums.ScheduleStatus;

import java.util.List;

public interface ScheduleService {
    ScheduleDTO createSchedule(CreateScheduleRequest request);
    List<ScheduleDTO> getAllSchedules();
    ScheduleDTO getSchedule(Long id);
    ScheduleDTO updateStatus(Long id, ScheduleStatus status);
    void deleteSchedule(Long id);
    List<ScheduleDTO> getSchedulesByLandlord(Long landlordId);
} 