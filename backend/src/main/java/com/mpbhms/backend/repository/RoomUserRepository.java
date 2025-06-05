package com.mpbhms.backend.repository;

import com.mpbhms.backend.entity.RoomEntity;
import com.mpbhms.backend.entity.RoomUserEntity;
import com.mpbhms.backend.entity.UserEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface RoomUserRepository extends JpaRepository<RoomUserEntity, Long> {
    boolean existsByRoomAndUser(RoomEntity room, UserEntity user);

    Optional<RoomUserEntity> findByRoomAndUser(RoomEntity room, UserEntity user);
}
