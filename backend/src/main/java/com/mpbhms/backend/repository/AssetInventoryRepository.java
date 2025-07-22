package com.mpbhms.backend.repository;

import com.mpbhms.backend.entity.AssetInventory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AssetInventoryRepository extends JpaRepository<AssetInventory, Long> {
    List<AssetInventory> findByRoomNumber(String roomNumber);
    List<AssetInventory> findByRoomNumberAndContractId(String roomNumber, Long contractId);
    boolean existsByAssetIdAndContractIdAndType(Long assetId, Long contractId, String type);
} 