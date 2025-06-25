package com.mpbhms.backend.repository;

import com.mpbhms.backend.entity.Room;
import com.mpbhms.backend.entity.CustomService;
import com.mpbhms.backend.entity.ServiceReading;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.data.repository.query.Param;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface ServiceReadingRepository extends JpaRepository<ServiceReading, Long> {
    Optional<ServiceReading> findTopByRoomAndServiceOrderByCreatedDateDesc(Room room, CustomService customService);

    @Query("SELECT s FROM ServiceReading s WHERE s.room.id = :roomId AND s.service IN :services AND s.createdDate BETWEEN :from AND :to")
    List<ServiceReading> findByRoomAndServicesInDateRange(Long roomId, List<CustomService> customServices, Instant from, Instant to);

    @Query("SELECT sr FROM ServiceReading sr JOIN FETCH sr.service " +
            "WHERE sr.room.id = :roomId AND sr.createdDate BETWEEN :from AND :to")
    List<ServiceReading> findByRoomAndDateRange(@Param("roomId") Long roomId,
                                                @Param("from") Instant from,
                                                @Param("to") Instant to);

    @Query("SELECT s FROM ServiceReading s WHERE s.room.id = :roomId AND s.service = :service AND s.createdDate BETWEEN :from AND :to")
    List<ServiceReading> findByRoomAndServiceAndDateRange(
            @Param("roomId") Long roomId,
            @Param("service") CustomService service,
            @Param("from") Instant from,
            @Param("to") Instant to
    );

    List<ServiceReading> findByService_Id(Long serviceId);

}
