package com.mpbhms.backend.service;

import com.mpbhms.backend.dto.AssetDTO;
import com.mpbhms.backend.entity.Asset;
import java.util.List;

public interface AssetService {
    List<AssetDTO> getAllAssets();
    AssetDTO getAssetById(Long id);
    AssetDTO createAsset(AssetDTO assetDTO);
    AssetDTO updateAsset(Long id, AssetDTO assetDTO);
    void deleteAsset(Long id);
    List<AssetDTO> findByAssetName(String assetName);
} 