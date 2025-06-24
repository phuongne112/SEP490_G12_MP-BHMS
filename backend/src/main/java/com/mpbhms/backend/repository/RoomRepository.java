package com.mpbhms.backend.repository;

import com.mpbhms.backend.entity.Room;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

@Repository
public interface RoomRepository extends JpaRepository<Room, Long>, JpaSpecificationExecutor<Room> {
    boolean existsByRoomNumber(String roomNumber);
//    Page<RoomEntity> findAllByIsActiveTrue(Pageable pageable);
@EntityGraph(attributePaths = "images")
Page<Room> findAll(Specification<Room> spec, Pageable pageable);

    // Lấy các phòng có người thuê
    Page<Room> findByRoomUsersIsNotEmpty(Pageable pageable);
}
