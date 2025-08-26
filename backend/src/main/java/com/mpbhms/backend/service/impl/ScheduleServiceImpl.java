package com.mpbhms.backend.service.impl;

import com.mpbhms.backend.dto.CreateScheduleRequest;
import com.mpbhms.backend.dto.ScheduleDTO;
import com.mpbhms.backend.dto.RoomDTO;
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
import java.time.LocalDate;
import java.time.ZoneId;

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
        // Validation cơ bản
        if (request.getAppointmentTime() == null) {
            throw new RuntimeException("Thời gian đặt lịch không được để trống");
        }
        
        if (request.getEmail() == null || request.getEmail().trim().isEmpty()) {
            throw new RuntimeException("Email không được để trống");
        }
        
        // Kiểm tra thời gian đặt lịch không được trong quá khứ
        if (request.getAppointmentTime().isBefore(java.time.Instant.now())) {
            throw new RuntimeException("Không thể đặt lịch trong quá khứ");
        }
        
        // Kiểm tra thời gian đặt lịch phải cách hiện tại ít nhất 1 giờ
        java.time.Instant minBookingTime = java.time.Instant.now().plusSeconds(3600); // 1 giờ
        if (request.getAppointmentTime().isBefore(minBookingTime)) {
            throw new RuntimeException("Vui lòng đặt lịch trước ít nhất 1 giờ");
        }
        
        // Luật 1: Không thể đặt lịch trùng thời gian với lịch hẹn khác của bạn
        List<Schedule> overlappingUserAppointments = scheduleRepository.findOverlappingAppointmentsByEmail(
            request.getEmail(), request.getAppointmentTime());
        
        if (!overlappingUserAppointments.isEmpty()) {
            throw new RuntimeException("Bạn đã có lịch hẹn khác vào thời gian này. Vui lòng chọn thời gian khác.");
        }
        
        // Luật 2: Giới hạn tối đa 4 người xem cùng lúc
        long peopleViewingAtTime = scheduleRepository.countPeopleViewingRoomAtTime(
            request.getRoomId(), request.getAppointmentTime());
        
        if (peopleViewingAtTime >= 4) {
            throw new RuntimeException("Phòng này đã có đủ người xem vào thời gian này (tối đa 4 người). Vui lòng chọn thời gian khác.");
        }
        
        // Luật 3: Tối đa 3 lịch hẹn tổng cộng cho mỗi người dùng
        long totalUserAppointments = scheduleRepository.countTotalAppointmentsByEmail(request.getEmail());
        
        if (totalUserAppointments >= 3) {
            throw new RuntimeException("Bạn đã đặt tối đa 3 lịch hẹn. Vui lòng hủy một lịch hẹn cũ trước khi đặt lịch hẹn mới.");
        }
        
        // Luật 4: Các lịch hẹn phải cách nhau ít nhất 30 phút
        java.time.Instant thirtyMinutesBefore = request.getAppointmentTime().minusSeconds(30 * 60); // 30 phút trước
        java.time.Instant thirtyMinutesAfter = request.getAppointmentTime().plusSeconds(30 * 60);   // 30 phút sau
        
        List<Schedule> nearbyAppointments = scheduleRepository.findAppointmentsInTimeRange(
            request.getRoomId(), thirtyMinutesBefore, thirtyMinutesAfter);
        
        if (!nearbyAppointments.isEmpty()) {
            throw new RuntimeException("Phòng này đã có lịch hẹn trong khoảng 30 phút trước hoặc sau thời gian này. Vui lòng chọn thời gian khác (cách nhau ít nhất 30 phút).");
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
            noti.setType(NotificationType.BOOKING_STATUS);
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
        ScheduleStatus oldStatus = schedule.getStatus();
        schedule.setStatus(status);
        schedule = scheduleRepository.save(schedule);
        
        // Gửi thông báo cho người dùng khi landlord thay đổi trạng thái lịch hẹn
        if (oldStatus != status) {
            try {
                // Tìm user để gửi thông báo (ưu tiên renter, nếu không có thì tìm theo email)
                User recipient = null;
                if (schedule.getRenter() != null) {
                    recipient = schedule.getRenter();
                } else if (schedule.getEmail() != null) {
                    try {
                        recipient = userRepository.findByEmail(schedule.getEmail());
                    } catch (Exception e) {
                        // Nếu không tìm thấy user với email này, để recipient = null
                        recipient = null;
                    }
                }
                
                if (recipient != null) {
                    NotificationDTO notification = new NotificationDTO();
                    notification.setRecipientId(recipient.getId());
                    
                    String roomNumber = schedule.getRoom() != null ? schedule.getRoom().getRoomNumber() : "phòng";
                    String appointmentTime = schedule.getAppointmentTime() != null ? 
                        java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")
                            .format(schedule.getAppointmentTime().atZone(java.time.ZoneId.systemDefault())) : "";
                    
                    switch (status) {
                        case CONFIRMED:
                            notification.setTitle("Lịch hẹn xem phòng đã được xác nhận");
                            notification.setMessage("Lịch hẹn xem " + roomNumber + " vào lúc " + appointmentTime + " đã được chủ nhà xác nhận. Vui lòng đến đúng giờ hẹn.");
                            notification.setType(NotificationType.BOOKING_STATUS);
                            break;
                        case REJECTED:
                            notification.setTitle("Lịch hẹn xem phòng bị từ chối");
                            notification.setMessage("Lịch hẹn xem " + roomNumber + " vào lúc " + appointmentTime + " đã bị chủ nhà từ chối. Vui lòng liên hệ chủ nhà để biết thêm chi tiết hoặc đặt lịch hẹn khác.");
                            notification.setType(NotificationType.BOOKING_STATUS);
                            break;
                        case CANCELLED:
                            notification.setTitle("Lịch hẹn xem phòng bị hủy");
                            notification.setMessage("Lịch hẹn xem " + roomNumber + " vào lúc " + appointmentTime + " đã bị hủy. Vui lòng liên hệ chủ nhà để biết thêm chi tiết hoặc đặt lịch hẹn khác.");
                            notification.setType(NotificationType.BOOKING_STATUS);
                            break;
                        case COMPLETED:
                            notification.setTitle("Lịch hẹn xem phòng đã hoàn thành");
                            notification.setMessage("Lịch hẹn xem " + roomNumber + " vào lúc " + appointmentTime + " đã hoàn thành. Cảm ơn bạn đã sử dụng dịch vụ của chúng tôi.");
                            notification.setType(NotificationType.BOOKING_STATUS);
                            break;
                        default:
                            // Không gửi thông báo cho các trạng thái khác
                            break;
                    }
                    
                    if (notification.getTitle() != null) {
                        notificationService.createAndSend(notification);
                    }
                }
            } catch (Exception e) {
                // Log lỗi nhưng không làm gián đoạn quá trình cập nhật trạng thái
                System.err.println("Lỗi gửi thông báo khi cập nhật trạng thái lịch hẹn: " + e.getMessage());
            }
        }
        
        return toDTO(schedule);
    }

    @Override
    public ScheduleDTO updateSchedule(Long id, CreateScheduleRequest request) {
        Schedule schedule = scheduleRepository.findById(id).orElseThrow();

        // Kiểm tra lịch hẹn trùng thời gian khi cập nhật
        if (request.getAppointmentTime() != null) {
            // Validation thời gian
            if (request.getAppointmentTime().isBefore(java.time.Instant.now())) {
                throw new RuntimeException("Không thể đặt lịch trong quá khứ");
            }
            
            java.time.Instant minBookingTime = java.time.Instant.now().plusSeconds(3600); // 1 giờ
            if (request.getAppointmentTime().isBefore(minBookingTime)) {
                throw new RuntimeException("Vui lòng đặt lịch trước ít nhất 1 giờ");
            }
            
            // Luật 1: Không thể đặt lịch trùng thời gian với lịch hẹn khác của bạn (loại trừ lịch hẹn hiện tại)
            List<Schedule> overlappingUserAppointments = scheduleRepository.findOverlappingAppointmentsByEmail(
                request.getEmail(), request.getAppointmentTime());
            
            // Lọc ra lịch hẹn hiện tại để không tính vào trùng lặp
            overlappingUserAppointments = overlappingUserAppointments.stream()
                .filter(s -> !s.getId().equals(id))
                .collect(Collectors.toList());
            
            if (!overlappingUserAppointments.isEmpty()) {
                throw new RuntimeException("Bạn đã có lịch hẹn khác vào thời gian này. Vui lòng chọn thời gian khác.");
            }
            
            // Luật 2: Giới hạn tối đa 4 người xem cùng lúc (loại trừ lịch hẹn hiện tại)
            long peopleViewingAtTime = scheduleRepository.countPeopleViewingRoomAtTime(
                request.getRoomId(), request.getAppointmentTime());
            
            // Lọc ra lịch hẹn hiện tại để không tính vào giới hạn
            List<Schedule> existingRoomAppointments = scheduleRepository.findOverlappingAppointments(
                request.getRoomId(), request.getAppointmentTime());
            long existingCount = existingRoomAppointments.stream()
                .filter(s -> !s.getId().equals(id))
                .count();
            
            if (existingCount >= 4) {
                throw new RuntimeException("Phòng này đã có đủ người xem vào thời gian này (tối đa 4 người). Vui lòng chọn thời gian khác.");
            }
            
            // Luật 3: Các lịch hẹn phải cách nhau ít nhất 30 phút (loại trừ lịch hẹn hiện tại)
            java.time.Instant thirtyMinutesBefore = request.getAppointmentTime().minusSeconds(30 * 60); // 30 phút trước
            java.time.Instant thirtyMinutesAfter = request.getAppointmentTime().plusSeconds(30 * 60);   // 30 phút sau
            
            List<Schedule> nearbyAppointments = scheduleRepository.findAppointmentsInTimeRange(
                request.getRoomId(), thirtyMinutesBefore, thirtyMinutesAfter);
            
            // Lọc ra lịch hẹn hiện tại để không tính vào kiểm tra
            nearbyAppointments = nearbyAppointments.stream()
                .filter(s -> !s.getId().equals(id))
                .collect(Collectors.toList());
            
            if (!nearbyAppointments.isEmpty()) {
                throw new RuntimeException("Phòng này đã có lịch hẹn trong khoảng 30 phút trước hoặc sau thời gian này. Vui lòng chọn thời gian khác (cách nhau ít nhất 30 phút).");
            }
            
            // Luật 4: Tối đa 3 lịch hẹn tổng cộng cho mỗi người dùng (loại trừ lịch hẹn hiện tại)
            long totalUserAppointments = scheduleRepository.countTotalAppointmentsByEmail(request.getEmail());
            
            // Nếu lịch hẹn hiện tại không được tính trong tổng số, thì cần trừ đi 1
            if (schedule.getEmail().equals(request.getEmail())) {
                totalUserAppointments = totalUserAppointments - 1;
            }
            
            if (totalUserAppointments >= 3) {
                throw new RuntimeException("Bạn đã đặt tối đa 3 lịch hẹn. Vui lòng hủy một lịch hẹn cũ trước khi đặt lịch hẹn mới.");
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

        // Cho phép ADMIN, SUBADMIN, LANDLORD xóa lịch hẹn
        boolean isAdminRole = false;
        if (currentUser != null && currentUser.getRole() != null) {
            String roleName = currentUser.getRole().getRoleName();
            if ("ADMIN".equals(roleName) || "SUBADMIN".equals(roleName) || "LANDLORD".equals(roleName)) {
                isAdminRole = true;
            }
        }
        if (isAdminRole) {
            // Admin roles có thể xóa bất kỳ lịch hẹn nào
            scheduleRepository.delete(schedule);
            return;
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
    public ResultPaginationDTO searchAndFilter(Long landlordId, String search, ScheduleStatus status, Instant from, Instant to, Integer hourFrom, Integer hourTo, int page, int pageSize) {
        Pageable pageable = PageRequest.of(page, pageSize);
        Page<Schedule> resultPage = scheduleRepository.searchAndFilter(
            landlordId,
            (search == null || search.isBlank()) ? null : search,
            status != null ? status.name() : null,
            from,
            to,
            hourFrom,
            hourTo,
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
        
        // Thêm thông tin room
        if (schedule.getRoom() != null) {
            RoomDTO roomDTO = new RoomDTO();
            roomDTO.setId(schedule.getRoom().getId());
            roomDTO.setRoomNumber(schedule.getRoom().getRoomNumber());
            roomDTO.setBuilding(schedule.getRoom().getBuilding());
            dto.setRoom(roomDTO);
        }
        
        return dto;
    }
} 