package com.mpbhms.backend.repository;

import com.mpbhms.backend.entity.RoomServiceMapping;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface RoomServiceMappingRepository extends JpaRepository<RoomServiceMapping, Long> {
    Optional<RoomServiceMapping> findByRoomIdAndServiceId(Long roomId, Long serviceId);
} 