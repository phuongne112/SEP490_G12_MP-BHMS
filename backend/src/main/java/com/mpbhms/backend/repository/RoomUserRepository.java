package com.mpbhms.backend.repository;

import com.mpbhms.backend.entity.RoomUser;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RoomUserRepository extends JpaRepository<RoomUser, Long> {
    int countByRoomId(Long roomId);
    RoomUser findTopByUserIdOrderByJoinedAtDesc(Long userId);
}
