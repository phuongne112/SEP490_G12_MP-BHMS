package com.mpbhms.backend.service.impl;

import com.mpbhms.backend.entity.RoomAsset;
import com.mpbhms.backend.entity.Room;
import com.mpbhms.backend.entity.Asset;
import com.mpbhms.backend.repository.RoomAssetRepository;
import com.mpbhms.backend.repository.RoomRepository;
import com.mpbhms.backend.repository.AssetRepository;
import com.mpbhms.backend.service.RoomAssetService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.List;
import com.mpbhms.backend.dto.RoomAssetDTO;

@Service
@RequiredArgsConstructor
public class RoomAssetServiceImpl implements RoomAssetService {
    private final RoomAssetRepository roomAssetRepository;
    private final RoomRepository roomRepository;
    private final AssetRepository assetRepository;

    @Override
    public RoomAssetDTO addAssetToRoom(Long roomId, Long assetId, Integer quantity, String status, String note) {
        Room room = roomRepository.findById(roomId).orElseThrow();
        Asset asset = assetRepository.findById(assetId).orElseThrow();
        RoomAsset ra = new RoomAsset();
        ra.setRoom(room);
        ra.setAsset(asset);
        ra.setQuantity(quantity);
        ra.setStatus(status);
        ra.setNote(note);
        return toDTO(roomAssetRepository.save(ra));
    }

    @Override
    public List<RoomAssetDTO> getAssetsByRoom(Long roomId) {
        Room room = roomRepository.findById(roomId).orElseThrow();
        return roomAssetRepository.findByRoom(room).stream().map(this::toDTO).toList();
    }

    @Override
    public RoomAssetDTO updateRoomAsset(Long id, Integer quantity, String status, String note) {
        RoomAsset ra = roomAssetRepository.findById(id).orElseThrow();
        ra.setQuantity(quantity);
        ra.setStatus(status);
        ra.setNote(note);
        return toDTO(roomAssetRepository.save(ra));
    }

    @Override
    public void deleteRoomAsset(Long id) {
        roomAssetRepository.deleteById(id);
    }

    private RoomAssetDTO toDTO(RoomAsset ra) {
        RoomAssetDTO dto = new RoomAssetDTO();
        dto.setId(ra.getId());
        dto.setAssetId(ra.getAsset().getId());
        dto.setAssetName(ra.getAsset().getAssetName());
        dto.setRoomId(ra.getRoom().getId());
        dto.setQuantity(ra.getQuantity());
        dto.setStatus(ra.getStatus());
        dto.setNote(ra.getNote());
        return dto;
    }
} 