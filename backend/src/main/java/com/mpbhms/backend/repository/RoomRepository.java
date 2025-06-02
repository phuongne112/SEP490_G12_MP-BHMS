package com.mpbhms.backend.repository;

import com.mpbhms.backend.entity.RoomEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RoomRepository extends JpaRepository<RoomEntity, Long>, JpaSpecificationExecutor<RoomEntity> {
    boolean existsByRoomNumber(String roomNumber);
//    Page<RoomEntity> findAllByIsActiveTrue(Pageable pageable);

}
