package com.mpbhms.backend.service.impl;

import com.mpbhms.backend.dto.CreateScheduleRequest;
import com.mpbhms.backend.dto.ScheduleDTO;
import com.mpbhms.backend.entity.Room;
import com.mpbhms.backend.entity.Schedule;
import com.mpbhms.backend.entity.User;
import com.mpbhms.backend.enums.ScheduleStatus;
import com.mpbhms.backend.repository.RoomRepository;
import com.mpbhms.backend.repository.ScheduleRepository;
import com.mpbhms.backend.repository.UserRepository;
import com.mpbhms.backend.service.ScheduleService;
import com.mpbhms.backend.service.NotificationService;
import com.mpbhms.backend.dto.NotificationDTO;
import com.mpbhms.backend.enums.NotificationType;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.mpbhms.backend.dto.ResultPaginationDTO;
import com.mpbhms.backend.dto.Meta;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.time.Instant;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class ScheduleServiceImpl implements ScheduleService {
    @Autowired
    private ScheduleRepository scheduleRepository;
    @Autowired
    private RoomRepository roomRepository;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private NotificationService notificationService;

    @Override
    public ScheduleDTO createSchedule(CreateScheduleRequest request) {
        Schedule schedule = new Schedule();
        Room room = roomRepository.findById(request.getRoomId()).orElseThrow();
        schedule.setRoom(room);
        if (request.getRenterId() != null) {
            Optional<User> renter = userRepository.findById(request.getRenterId());
            renter.ifPresent(schedule::setRenter);
        }
        schedule.setFullName(request.getFullName());
        schedule.setPhone(request.getPhone());
        schedule.setEmail(request.getEmail());
        schedule.setAppointmentTime(request.getAppointmentTime());
        schedule.setNote(request.getNote());
        schedule.setStatus(ScheduleStatus.PENDING);
        schedule = scheduleRepository.save(schedule);
        if (room.getLandlord() != null) {
            NotificationDTO noti = new NotificationDTO();
            noti.setRecipientId(room.getLandlord().getId());
            noti.setTitle("Có lịch hẹn mới");
            noti.setMessage("Bạn có lịch hẹn mới từ " + request.getFullName() + " cho phòng " + room.getRoomNumber());
            noti.setType(NotificationType.SCHEDULE);
            notificationService.createAndSend(noti);
        }
        return toDTO(schedule);
    }

    @Override
    public List<ScheduleDTO> getAllSchedules() {
        List<Schedule> schedules = scheduleRepository.findAll();
        return schedules.stream().map(this::toDTO).collect(Collectors.toList());
    }

    @Override
    public ScheduleDTO getSchedule(Long id) {
        Schedule schedule = scheduleRepository.findById(id).orElseThrow();
        return toDTO(schedule);
    }

    @Override
    public ScheduleDTO updateStatus(Long id, ScheduleStatus status) {
        Schedule schedule = scheduleRepository.findById(id).orElseThrow();
        schedule.setStatus(status);
        schedule = scheduleRepository.save(schedule);
        return toDTO(schedule);
    }

    @Override
    public void deleteSchedule(Long id) {
        scheduleRepository.deleteById(id);
    }

    @Override
    public List<ScheduleDTO> getSchedulesByLandlord(Long landlordId) {
        List<Schedule> schedules = scheduleRepository.findByRoom_Landlord_Id(landlordId);
        return schedules.stream().map(this::toDTO).collect(Collectors.toList());
    }

    @Override
    public ResultPaginationDTO searchAndFilter(Long landlordId, String search, ScheduleStatus status, Instant from, Instant to, int page, int pageSize) {
        Pageable pageable = PageRequest.of(page, pageSize);
        Page<Schedule> resultPage = scheduleRepository.searchAndFilter(
            landlordId,
            (search == null || search.isBlank()) ? null : search,
            status,
            from,
            to,
            pageable
        );
        ResultPaginationDTO dto = new ResultPaginationDTO();
        Meta meta = new Meta();
        meta.setPage(page + 1);
        meta.setPageSize(pageSize);
        meta.setPages(resultPage.getTotalPages());
        meta.setTotal(resultPage.getTotalElements());
        dto.setMeta(meta);
        dto.setResult(resultPage.getContent().stream().map(this::toDTO).collect(java.util.stream.Collectors.toList()));
        return dto;
    }

    @Override
    public List<ScheduleDTO> getSchedulesByRenter(Long renterId) {
        List<Schedule> schedules = scheduleRepository.findByRenter_Id(renterId);
        return schedules.stream().map(this::toDTO).collect(Collectors.toList());
    }

    @Override
    public List<ScheduleDTO> getSchedulesByEmail(String email) {
        List<Schedule> schedules = scheduleRepository.findByEmail(email);
        return schedules.stream().map(this::toDTO).collect(Collectors.toList());
    }

    private ScheduleDTO toDTO(Schedule schedule) {
        ScheduleDTO dto = new ScheduleDTO();
        dto.setId(schedule.getId());
        dto.setRoomId(schedule.getRoom() != null ? schedule.getRoom().getId() : null);
        dto.setRenterId(schedule.getRenter() != null ? schedule.getRenter().getId() : null);
        dto.setFullName(schedule.getFullName());
        dto.setPhone(schedule.getPhone());
        dto.setEmail(schedule.getEmail());
        dto.setAppointmentTime(schedule.getAppointmentTime());
        dto.setNote(schedule.getNote());
        dto.setStatus(schedule.getStatus());
        return dto;
    }
} 