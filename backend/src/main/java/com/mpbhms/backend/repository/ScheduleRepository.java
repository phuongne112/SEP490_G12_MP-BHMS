package com.mpbhms.backend.repository;

import com.mpbhms.backend.entity.Schedule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ScheduleRepository extends JpaRepository<Schedule, Long> {
    // Lấy tất cả lịch hẹn của các phòng thuộc landlord
    List<Schedule> findByRoom_Landlord_Id(Long landlordId);
} 