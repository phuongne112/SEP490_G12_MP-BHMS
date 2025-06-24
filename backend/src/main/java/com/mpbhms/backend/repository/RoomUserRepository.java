package com.mpbhms.backend.repository;

import com.mpbhms.backend.entity.RoomUser;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RoomUserRepository extends JpaRepository<RoomUser, Long> {
    int countByRoomId(Long roomId);
    List<RoomUser> findByContractId(Long contractId);
    RoomUser findTopByUserIdOrderByJoinedAtDesc(Long userId);
}
