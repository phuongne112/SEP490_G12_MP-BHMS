package com.mpbhms.backend.controller;

import com.mpbhms.backend.dto.CreateScheduleRequest;
import com.mpbhms.backend.dto.ScheduleDTO;
import com.mpbhms.backend.dto.ResultPaginationDTO;
import com.mpbhms.backend.enums.ScheduleStatus;
import com.mpbhms.backend.service.ScheduleService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping("/mpbhms/schedules")
public class ScheduleController {
    @Autowired
    private ScheduleService scheduleService;

    @PostMapping
    public ResponseEntity<ScheduleDTO> createSchedule(@RequestBody CreateScheduleRequest request) {
        return ResponseEntity.ok(scheduleService.createSchedule(request));
    }

    @GetMapping
    public ResponseEntity<ResultPaginationDTO> getAllSchedules(
            @RequestParam(required = false) Long landlordId,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) ScheduleStatus status,
            @RequestParam(required = false) Instant from,
            @RequestParam(required = false) Instant to,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int pageSize
    ) {
        return ResponseEntity.ok(scheduleService.searchAndFilter(landlordId, search, status, from, to, page, pageSize));
    }

    @GetMapping("/landlord")
    public ResponseEntity<List<ScheduleDTO>> getSchedulesForLandlord(@RequestParam Long landlordId) {
        return ResponseEntity.ok(scheduleService.getSchedulesByLandlord(landlordId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ScheduleDTO> getSchedule(@PathVariable Long id) {
        return ResponseEntity.ok(scheduleService.getSchedule(id));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<ScheduleDTO> updateStatus(@PathVariable Long id, @RequestParam ScheduleStatus status) {
        return ResponseEntity.ok(scheduleService.updateStatus(id, status));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteSchedule(@PathVariable Long id) {
        scheduleService.deleteSchedule(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/my")
    public ResponseEntity<List<ScheduleDTO>> getMySchedules(@RequestParam(required = false) Long renterId, @RequestParam(required = false) String email) {
        if (renterId != null) {
            return ResponseEntity.ok(scheduleService.getSchedulesByRenter(renterId));
        } else if (email != null) {
            return ResponseEntity.ok(scheduleService.getSchedulesByEmail(email));
        } else {
            return ResponseEntity.badRequest().build();
        }
    }
} 