package com.mpbhms.backend.service;

import com.mpbhms.backend.entity.RoomAsset;
import com.mpbhms.backend.entity.Room;
import com.mpbhms.backend.entity.Asset;
import com.mpbhms.backend.dto.RoomAssetDTO;
import java.util.List;

public interface RoomAssetService {
    RoomAssetDTO addAssetToRoom(Long roomId, Long assetId, Integer quantity, String status, String note);
    java.util.List<RoomAssetDTO> getAssetsByRoom(Long roomId);
    RoomAssetDTO updateRoomAsset(Long id, Integer quantity, String status, String note);
    void deleteRoomAsset(Long id);
} 