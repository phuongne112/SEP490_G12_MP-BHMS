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
import com.mpbhms.backend.util.SecurityUtil;

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
        // Kiểm tra lịch hẹn trùng thời gian cho cùng một người dùng (email)
        if (request.getAppointmentTime() != null) {
            List<Schedule> overlappingUserAppointments = scheduleRepository.findOverlappingAppointmentsByEmail(
                request.getEmail(), request.getAppointmentTime());
            
            if (!overlappingUserAppointments.isEmpty()) {
                throw new RuntimeException("Bạn đã có lịch hẹn khác vào thời gian này. Vui lòng chọn thời gian khác.");
            }
            
            // Kiểm tra giới hạn spam: tối đa 3 lịch hẹn mỗi ngày cho mỗi người
            java.time.Instant appointmentTime = request.getAppointmentTime();
            java.time.LocalDate appointmentDate = appointmentTime.atZone(java.time.ZoneId.systemDefault()).toLocalDate();
            java.time.Instant startOfDay = appointmentDate.atStartOfDay(java.time.ZoneId.systemDefault()).toInstant();
            java.time.Instant endOfDay = appointmentDate.plusDays(1).atStartOfDay(java.time.ZoneId.systemDefault()).toInstant();
            
            long userAppointmentsInDay = scheduleRepository.countAppointmentsByEmailInTimeRange(
                request.getEmail(), startOfDay, endOfDay);
            
            if (userAppointmentsInDay >= 3) {
                throw new RuntimeException("Bạn đã đặt 3 lịch hẹn vào ngày " + appointmentDate + ". Vui lòng thử lại vào ngày khác.");
            }
            
            // Kiểm tra số người đang xem phòng tại thời điểm này (tối đa 4 người cùng lúc)
            long peopleViewingAtTime = scheduleRepository.countPeopleViewingRoomAtTime(
                request.getRoomId(), request.getAppointmentTime());
            
            if (peopleViewingAtTime >= 4) {
                throw new RuntimeException("Phòng này đã có đủ người xem vào thời gian này. Vui lòng chọn thời gian khác.");
            }
            
            // Kiểm tra giới hạn số người xem phòng: tối đa 8 người cùng xem một phòng mỗi ngày
            long roomAppointmentsInDay = scheduleRepository.countAppointmentsByRoomInTimeRange(
                request.getRoomId(), startOfDay, endOfDay);
            
            if (roomAppointmentsInDay >= 8) {
                throw new RuntimeException("Phòng này đã có quá nhiều người đặt xem vào ngày " + appointmentDate + ". Vui lòng chọn ngày khác.");
            }
        }
        
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
            noti.setTitle("Lịch hẹn mới");
            noti.setMessage("Bạn vừa nhận được một lịch hẹn mới từ " + request.getFullName() + " cho phòng " + room.getRoomNumber() + ". Vui lòng kiểm tra và xác nhận lịch hẹn này.");
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
    public ScheduleDTO updateSchedule(Long id, CreateScheduleRequest request) {
        Schedule schedule = scheduleRepository.findById(id).orElseThrow();
        
        // Kiểm tra lịch hẹn trùng thời gian khi cập nhật
        if (request.getAppointmentTime() != null) {
            // Kiểm tra trùng thời gian cho cùng một người dùng (email) (loại trừ lịch hẹn hiện tại)
            List<Schedule> overlappingUserAppointments = scheduleRepository.findOverlappingAppointmentsByEmail(
                request.getEmail(), request.getAppointmentTime());
            
            // Lọc ra lịch hẹn hiện tại để không tính vào trùng lặp
            overlappingUserAppointments = overlappingUserAppointments.stream()
                .filter(s -> !s.getId().equals(id))
                .collect(Collectors.toList());
            
            if (!overlappingUserAppointments.isEmpty()) {
                throw new RuntimeException("Bạn đã có lịch hẹn khác vào thời gian này. Vui lòng chọn thời gian khác.");
            }
            
            // Kiểm tra số người đang xem phòng tại thời điểm này (tối đa 4 người cùng lúc)
            List<Schedule> existingRoomAppointments = scheduleRepository.findOverlappingAppointments(
                request.getRoomId(), request.getAppointmentTime());
            long existingCount = existingRoomAppointments.stream()
                .filter(s -> !s.getId().equals(id))
                .count();
            
            if (existingCount >= 4) {
                throw new RuntimeException("Phòng này đã có đủ người xem vào thời gian này. Vui lòng chọn thời gian khác.");
            }
            
            // Kiểm tra giới hạn số người xem phòng: tối đa 8 người cùng xem một phòng mỗi ngày
            java.time.Instant appointmentTime = request.getAppointmentTime();
            java.time.LocalDate appointmentDate = appointmentTime.atZone(java.time.ZoneId.systemDefault()).toLocalDate();
            java.time.Instant startOfDay = appointmentDate.atStartOfDay(java.time.ZoneId.systemDefault()).toInstant();
            java.time.Instant endOfDay = appointmentDate.plusDays(1).atStartOfDay(java.time.ZoneId.systemDefault()).toInstant();
            
            long roomAppointmentsInDay = scheduleRepository.countAppointmentsByRoomInTimeRange(
                request.getRoomId(), startOfDay, endOfDay);
            
            // Lọc ra lịch hẹn hiện tại để không tính vào giới hạn
            List<Schedule> allRoomAppointments = scheduleRepository.findOverlappingAppointments(
                request.getRoomId(), request.getAppointmentTime());
            long allCount = allRoomAppointments.stream()
                .filter(s -> !s.getId().equals(id))
                .count();
            
            if (allCount >= 8) {
                throw new RuntimeException("Phòng này đã có quá nhiều người đặt xem vào ngày " + appointmentDate + ". Vui lòng chọn ngày khác.");
            }
        }
        
        // Cập nhật thông tin lịch hẹn
        if (request.getRoomId() != null) {
            Room room = roomRepository.findById(request.getRoomId()).orElseThrow();
            schedule.setRoom(room);
        }
        if (request.getRenterId() != null) {
            Optional<User> renter = userRepository.findById(request.getRenterId());
            renter.ifPresent(schedule::setRenter);
        }
        schedule.setFullName(request.getFullName());
        schedule.setPhone(request.getPhone());
        schedule.setEmail(request.getEmail());
        schedule.setAppointmentTime(request.getAppointmentTime());
        schedule.setNote(request.getNote());
        
        schedule = scheduleRepository.save(schedule);
        return toDTO(schedule);
    }

    @Override
    public void deleteSchedule(Long id) {
        Schedule schedule = scheduleRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Không tìm thấy lịch hẹn"));

        Long currentUserId = SecurityUtil.getCurrentUserId();
        User currentUser = null;
        if (currentUserId != null) {
            currentUser = userRepository.findById(currentUserId).orElse(null);
        }

        // Chỉ chặn các role đặc biệt
        boolean isForbiddenRole = false;
        if (currentUser != null && currentUser.getRole() != null) {
            String roleName = currentUser.getRole().getRoleName();
            if ("ADMIN".equals(roleName) || "SUBADMIN".equals(roleName) || "LANDLORD".equals(roleName)) {
                isForbiddenRole = true;
            }
        }
        if (isForbiddenRole) {
            throw new RuntimeException("Bạn không có quyền xóa lịch hẹn này!");
        }

        boolean isOwner = false;
        if (currentUser != null) {
            // Nếu là renter của lịch hẹn
            if (schedule.getRenter() != null && schedule.getRenter().getId().equals(currentUser.getId())) {
                isOwner = true;
            }
            // Nếu là user thường hoặc không có role, kiểm tra email trùng với lịch hẹn
            if (schedule.getEmail() != null && schedule.getEmail().equalsIgnoreCase(currentUser.getEmail())) {
                isOwner = true;
            }
        }
        System.out.println("[DEBUG] isOwner: " + isOwner);

        if (!isOwner) {
            throw new RuntimeException("Bạn không có quyền xóa lịch hẹn này!");
        }

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