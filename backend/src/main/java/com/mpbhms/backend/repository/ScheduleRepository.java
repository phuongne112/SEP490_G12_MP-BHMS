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
} 