package com.mpbhms.backend.repository;

import com.mpbhms.backend.entity.Asset;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface AssetRepository extends JpaRepository<Asset, Long> {
    List<Asset> findByAssetNameContainingIgnoreCase(String assetName);
    Page<Asset> findByAssetNameContainingIgnoreCase(String assetName, Pageable pageable);
    Page<Asset> findByAssetNameContainingIgnoreCaseAndAssetStatus(String assetName, com.mpbhms.backend.enums.AssetStatus assetStatus, Pageable pageable);
    Page<Asset> findByAssetStatus(com.mpbhms.backend.enums.AssetStatus assetStatus, Pageable pageable);
} 