package com.mpbhms.backend.service.impl;

import com.mpbhms.backend.dto.AssetDTO;
import com.mpbhms.backend.entity.Asset;
import com.mpbhms.backend.enums.AssetStatus;
import com.mpbhms.backend.repository.AssetRepository;
import com.mpbhms.backend.repository.RoomRepository;
import com.mpbhms.backend.entity.Room;
import com.mpbhms.backend.service.AssetService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.beans.BeanUtils;
import java.util.List;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
@RequiredArgsConstructor
public class AssetServiceImpl implements AssetService {
    private static final Logger logger = LoggerFactory.getLogger(AssetServiceImpl.class);
    private final AssetRepository assetRepository;
    private final RoomRepository roomRepository;

    @Override
    public List<AssetDTO> getAllAssets() {
        List<Asset> assets = assetRepository.findAll();
        logger.info("[AssetServiceImpl] getAllAssets - Số lượng asset: {}", assets.size());
        for (Asset asset : assets) {
            logger.info("Asset: id={}, name={}, status={}", asset.getId(), asset.getAssetName(), asset.getAssetStatus());
        }
        return assets.stream().map(this::toDTO).collect(Collectors.toList());
    }

    @Override
    public AssetDTO getAssetById(Long id) {
        Asset asset = assetRepository.findById(id).orElseThrow(() -> new RuntimeException("Asset not found"));
        return toDTO(asset);
    }

    @Override
    public AssetDTO createAsset(AssetDTO assetDTO) {
        Asset asset = toEntity(assetDTO);
        asset.setId(null); // ensure new
        if (assetDTO.getRoomId() != null) {
            Room room = roomRepository.findById(assetDTO.getRoomId())
                .orElseThrow(() -> new RuntimeException("Room not found"));
            asset.setRoom(room);
        }
        return toDTO(assetRepository.save(asset));
    }

    @Override
    public AssetDTO updateAsset(Long id, AssetDTO assetDTO) {
        Asset asset = assetRepository.findById(id).orElseThrow(() -> new RuntimeException("Asset not found"));
        asset.setAssetName(assetDTO.getAssetName());
        asset.setQuantity(assetDTO.getQuantity());
        asset.setConditionNote(assetDTO.getConditionNote());
        asset.setAssetStatus(AssetStatus.valueOf(assetDTO.getAssetStatus()));
        asset.setAssetImage(assetDTO.getAssetImage());
        if (assetDTO.getRoomId() != null) {
            Room room = roomRepository.findById(assetDTO.getRoomId())
                .orElseThrow(() -> new RuntimeException("Room not found"));
            asset.setRoom(room);
        }
        return toDTO(assetRepository.save(asset));
    }

    @Override
    public void deleteAsset(Long id) {
        assetRepository.deleteById(id);
    }

    @Override
    public List<AssetDTO> findByAssetName(String assetName) {
        List<Asset> assets = assetRepository.findByAssetNameContainingIgnoreCase(assetName);
        logger.info("[AssetServiceImpl] findByAssetName - Số lượng asset: {}", assets.size());
        return assets.stream().map(this::toDTO).collect(Collectors.toList());
    }

    private AssetDTO toDTO(Asset asset) {
        AssetDTO dto = new AssetDTO();
        BeanUtils.copyProperties(asset, dto);
        if (asset.getAssetStatus() != null) {
            dto.setAssetStatus(asset.getAssetStatus().name());
        }
        if (asset.getRoom() != null) {
            dto.setRoomId(asset.getRoom().getId());
        }
        return dto;
    }

    private Asset toEntity(AssetDTO dto) {
        Asset asset = new Asset();
        BeanUtils.copyProperties(dto, asset);
        if (dto.getAssetStatus() != null) {
            asset.setAssetStatus(AssetStatus.valueOf(dto.getAssetStatus()));
        }
        return asset;
    }
} 