package com.mpbhms.backend.repository;

import com.mpbhms.backend.entity.BillDetail;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface BillDetailRepository extends JpaRepository<BillDetail, Long> {
    @Query("SELECT bd FROM BillDetail bd WHERE bd.service.id = :serviceId AND bd.bill.room.id = :roomId")
    List<BillDetail> findByServiceIdAndRoomId(@Param("serviceId") Long serviceId, @Param("roomId") Long roomId);
} 