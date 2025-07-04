package com.mpbhms.backend.service;

import com.mpbhms.backend.dto.AssetDTO;
import com.mpbhms.backend.dto.AssetResponseDTO;
import com.mpbhms.backend.entity.Asset;
import java.util.List;
import com.mpbhms.backend.dto.ResultPaginationDTO;
import org.springframework.data.domain.Pageable;

public interface AssetService {
    List<AssetDTO> getAllAssets();
    AssetDTO getAssetById(Long id);
    AssetDTO createAsset(AssetDTO assetDTO);
    AssetDTO updateAsset(Long id, AssetDTO assetDTO);
    void deleteAsset(Long id);
    List<AssetDTO> findByAssetName(String assetName);
    ResultPaginationDTO searchAssets(String assetName, String assetStatus, Integer minQuantity, Integer maxQuantity, Pageable pageable);
} 