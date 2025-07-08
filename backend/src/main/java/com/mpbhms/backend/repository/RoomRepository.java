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
    boolean existsByRoomNumberAndDeletedFalse(String roomNumber);
    
    // Override method existsByRoomNumber để chỉ kiểm tra room chưa bị xóa
    default boolean existsByRoomNumber(String roomNumber) {
        return existsByRoomNumberAndDeletedFalse(roomNumber);
    }

//    Page<RoomEntity> findAllByIsActiveTrue(Pageable pageable);
@EntityGraph(attributePaths = "images")
Page<Room> findAll(Specification<Room> spec, Pageable pageable);

    // Lấy các phòng có người thuê (chưa bị xóa mềm)
    Page<Room> findByRoomUsersIsNotEmptyAndDeletedFalse(Pageable pageable);
    
    // Override method findByRoomUsersIsNotEmpty để chỉ lấy room chưa bị xóa
    default Page<Room> findByRoomUsersIsNotEmpty(Pageable pageable) {
        return findByRoomUsersIsNotEmptyAndDeletedFalse(pageable);
    }
    
    // Tìm room theo ID và chưa bị xóa mềm
    java.util.Optional<Room> findByIdAndDeletedFalse(Long id);
    
    // Tìm room theo ID và đã bị xóa mềm
    java.util.Optional<Room> findByIdAndDeletedTrue(Long id);
    
    // Lấy danh sách room đã bị xóa mềm
    Page<Room> findByDeletedTrue(Pageable pageable);

    // Tìm phòng theo số phòng và đã bị xóa mềm
    java.util.Optional<Room> findByRoomNumberAndDeletedTrue(String roomNumber);
}
