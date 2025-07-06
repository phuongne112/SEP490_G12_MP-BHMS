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
import com.mpbhms.backend.dto.AssetResponseDTO;
import com.mpbhms.backend.dto.ResultPaginationDTO;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

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
        Asset asset = assetRepository.findById(id).orElseThrow(() -> new RuntimeException("Không tìm thấy tài sản"));
        return toDTO(asset);
    }

    @Override
    public AssetDTO createAsset(AssetDTO assetDTO) {
        Asset asset = toEntity(assetDTO);
        asset.setId(null); // ensure new
        if (assetDTO.getRoomId() != null) {
            Room room = roomRepository.findById(assetDTO.getRoomId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy phòng"));
            asset.setRoom(room);
        }
        return toDTO(assetRepository.save(asset));
    }

    @Override
    public AssetDTO updateAsset(Long id, AssetDTO assetDTO) {
        Asset asset = assetRepository.findById(id).orElseThrow(() -> new RuntimeException("Không tìm thấy tài sản"));
        asset.setAssetName(assetDTO.getAssetName());
        asset.setQuantity(assetDTO.getQuantity());
        asset.setConditionNote(assetDTO.getConditionNote());
        asset.setAssetStatus(AssetStatus.valueOf(assetDTO.getAssetStatus()));
        asset.setAssetImage(assetDTO.getAssetImage());
        if (assetDTO.getRoomId() != null) {
            Room room = roomRepository.findById(assetDTO.getRoomId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy phòng"));
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

    @Override
    public ResultPaginationDTO searchAssets(String assetName, String assetStatus, Integer minQuantity, Integer maxQuantity, Pageable pageable) {
        String normalizedStatus = normalizeAssetStatus(assetStatus);
        List<Asset> all = assetRepository.findAll();
        List<Asset> filtered = all.stream()
            .filter(a -> (assetName == null || assetName.isEmpty() || a.getAssetName().toLowerCase().contains(assetName.toLowerCase())))
            .filter(a -> (normalizedStatus == null || normalizedStatus.isEmpty() || (a.getAssetStatus() != null && a.getAssetStatus().name().equalsIgnoreCase(normalizedStatus))))
            .filter(a -> (minQuantity == null || (a.getQuantity() != null && a.getQuantity().intValue() >= minQuantity)))
            .filter(a -> (maxQuantity == null || (a.getQuantity() != null && a.getQuantity().intValue() <= maxQuantity)))
            .toList();
        int start = pageable.getPageNumber() * pageable.getPageSize();
        int end = Math.min(start + pageable.getPageSize(), filtered.size());
        List<Asset> pageContent = (start < end) ? filtered.subList(start, end) : List.of();
        ResultPaginationDTO result = new ResultPaginationDTO();
        result.setResult(pageContent.stream().map(this::toDTO).collect(java.util.stream.Collectors.toList()));
        com.mpbhms.backend.dto.Meta meta = new com.mpbhms.backend.dto.Meta();
        meta.setPage(pageable.getPageNumber() + 1);
        meta.setPageSize(pageable.getPageSize());
        meta.setTotal(filtered.size());
        meta.setPages((int) Math.ceil((double) filtered.size() / pageable.getPageSize()));
        result.setMeta(meta);
        return result;
    }

    private String normalizeAssetStatus(String status) {
        if (status == null || status.isEmpty()) return status;
        return status.substring(0, 1).toUpperCase() + status.substring(1).toLowerCase();
    }

    private AssetDTO toDTO(Asset asset) {
        AssetDTO dto = new AssetDTO();
        dto.setId(asset.getId());
        dto.setAssetName(asset.getAssetName());
        dto.setQuantity(asset.getQuantity());
        dto.setConditionNote(asset.getConditionNote());
        dto.setAssetStatus(asset.getAssetStatus() != null ? asset.getAssetStatus().name() : null);
        dto.setAssetImage(asset.getAssetImage());
        dto.setRoomId(asset.getRoom() != null ? asset.getRoom().getId() : null);
        return dto;
    }

    private Asset toEntity(AssetDTO dto) {
        Asset asset = new Asset();
        asset.setAssetName(dto.getAssetName());
        asset.setQuantity(dto.getQuantity());
        asset.setConditionNote(dto.getConditionNote());
        if (dto.getAssetStatus() != null) {
            asset.setAssetStatus(AssetStatus.valueOf(dto.getAssetStatus()));
        }
        asset.setAssetImage(dto.getAssetImage());
        // Không set id ở đây (id sẽ được set = null khi tạo mới)
        // Room sẽ được set ở createAsset nếu có roomId
        return asset;
    }
} 