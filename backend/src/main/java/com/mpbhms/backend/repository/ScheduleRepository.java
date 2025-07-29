package com.mpbhms.backend.repository;

import com.mpbhms.backend.entity.Schedule;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ScheduleRepository extends JpaRepository<Schedule, Long> {
    // Lấy tất cả lịch hẹn của các phòng thuộc landlord
    List<Schedule> findByRoom_Landlord_Id(Long landlordId);

    // Phân trang, search, filter status, filter thời gian
    @Query("SELECT s FROM Schedule s WHERE " +
            "(:landlordId IS NULL OR s.room.landlord.id = :landlordId) AND " +
            "(:search IS NULL OR LOWER(s.fullName) LIKE LOWER(CONCAT('%', :search, '%'))) AND " +
            "(:status IS NULL OR s.status = :status) AND " +
            "(:from IS NULL OR s.appointmentTime >= :from) AND " +
            "(:to IS NULL OR s.appointmentTime <= :to)")
    Page<Schedule> searchAndFilter(@Param("landlordId") Long landlordId,
                                   @Param("search") String search,
                                   @Param("status") com.mpbhms.backend.enums.ScheduleStatus status,
                                   @Param("from") java.time.Instant from,
                                   @Param("to") java.time.Instant to,
                                   Pageable pageable);

    List<Schedule> findByRenter_Id(Long renterId);
    List<Schedule> findByEmail(String email);
    
    // Kiểm tra lịch hẹn trùng thời gian cho cùng một phòng
    @Query("SELECT s FROM Schedule s WHERE s.room.id = :roomId AND s.appointmentTime = :appointmentTime AND s.status IN ('PENDING', 'ACCEPTED')")
    List<Schedule> findOverlappingAppointments(@Param("roomId") Long roomId, @Param("appointmentTime") java.time.Instant appointmentTime);
    
    // Kiểm tra lịch hẹn trùng thời gian cho cùng một người dùng (email)
    @Query("SELECT s FROM Schedule s WHERE s.email = :email AND s.appointmentTime = :appointmentTime AND s.status IN ('PENDING', 'ACCEPTED')")
    List<Schedule> findOverlappingAppointmentsByEmail(@Param("email") String email, @Param("appointmentTime") java.time.Instant appointmentTime);
    
    // Kiểm tra số lịch hẹn của một người dùng trong khoảng thời gian (để ngăn spam)
    @Query("SELECT COUNT(s) FROM Schedule s WHERE s.email = :email AND s.appointmentTime BETWEEN :startTime AND :endTime AND s.status IN ('PENDING', 'ACCEPTED')")
    long countAppointmentsByEmailInTimeRange(@Param("email") String email, @Param("startTime") java.time.Instant startTime, @Param("endTime") java.time.Instant endTime);
    
    // Lấy danh sách lịch hẹn của một người dùng trong khoảng thời gian (để hiển thị chi tiết)
    @Query("SELECT s FROM Schedule s WHERE s.email = :email AND s.appointmentTime BETWEEN :startTime AND :endTime AND s.status IN ('PENDING', 'ACCEPTED') ORDER BY s.appointmentTime DESC")
    List<Schedule> findAppointmentsByEmailInTimeRange(@Param("email") String email, @Param("startTime") java.time.Instant startTime, @Param("endTime") java.time.Instant endTime);
    
    // Kiểm tra số lịch hẹn của một phòng trong khoảng thời gian (để ngăn spam)
    @Query("SELECT COUNT(s) FROM Schedule s WHERE s.room.id = :roomId AND s.appointmentTime BETWEEN :startTime AND :endTime AND s.status IN ('PENDING', 'ACCEPTED')")
    long countAppointmentsByRoomInTimeRange(@Param("roomId") Long roomId, @Param("startTime") java.time.Instant startTime, @Param("endTime") java.time.Instant endTime);
    
    // Đếm số người đang xem phòng tại một thời điểm cụ thể
    @Query("SELECT COUNT(s) FROM Schedule s WHERE s.room.id = :roomId AND s.appointmentTime = :appointmentTime AND s.status IN ('PENDING', 'ACCEPTED')")
    long countPeopleViewingRoomAtTime(@Param("roomId") Long roomId, @Param("appointmentTime") java.time.Instant appointmentTime);
} 