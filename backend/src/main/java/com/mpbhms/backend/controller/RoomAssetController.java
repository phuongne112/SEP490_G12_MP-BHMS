package com.mpbhms.backend.controller;

import com.mpbhms.backend.entity.RoomAsset;
import com.mpbhms.backend.entity.Room;
import com.mpbhms.backend.entity.Asset;
import com.mpbhms.backend.repository.RoomRepository;
import com.mpbhms.backend.repository.AssetRepository;
import com.mpbhms.backend.service.RoomAssetService;
import com.mpbhms.backend.dto.RoomAssetDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/mpbhms/room-assets")
@RequiredArgsConstructor
public class RoomAssetController {
    private final RoomAssetService roomAssetService;
    private final RoomRepository roomRepository;
    private final AssetRepository assetRepository;

    @PostMapping
    public ResponseEntity<RoomAssetDTO> addAssetToRoom(@RequestParam Long roomId, @RequestParam Long assetId,
                                                    @RequestParam Integer quantity, @RequestParam String status,
                                                    @RequestParam(required = false) String note) {
        return ResponseEntity.ok(roomAssetService.addAssetToRoom(roomId, assetId, quantity, status, note));
    }

    @GetMapping("/by-room")
    public ResponseEntity<java.util.List<RoomAssetDTO>> getAssetsByRoom(@RequestParam Long roomId) {
        return ResponseEntity.ok(roomAssetService.getAssetsByRoom(roomId));
    }

    @GetMapping("/by-room-number")
    public ResponseEntity<java.util.List<RoomAssetDTO>> getAssetsByRoomNumber(@RequestParam String roomNumber) {
        return roomRepository.findByRoomNumberAndDeletedFalse(roomNumber)
                .map(room -> ResponseEntity.ok(roomAssetService.getAssetsByRoom(room.getId())))
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}")
    public ResponseEntity<RoomAssetDTO> updateRoomAsset(@PathVariable Long id, @RequestParam Integer quantity,
                                                     @RequestParam String status, @RequestParam(required = false) String note) {
        return ResponseEntity.ok(roomAssetService.updateRoomAsset(id, quantity, status, note));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteRoomAsset(@PathVariable Long id) {
        roomAssetService.deleteRoomAsset(id);
        return ResponseEntity.ok().build();
    }
} 