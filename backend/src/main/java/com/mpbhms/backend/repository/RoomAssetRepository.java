package com.mpbhms.backend.repository;

import com.mpbhms.backend.entity.RoomAsset;
import com.mpbhms.backend.entity.Room;
import com.mpbhms.backend.entity.Asset;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface RoomAssetRepository extends JpaRepository<RoomAsset, Long> {
    List<RoomAsset> findByRoom(Room room);
    List<RoomAsset> findByAsset(Asset asset);
    RoomAsset findByRoomAndAsset(Room room, Asset asset);
} 