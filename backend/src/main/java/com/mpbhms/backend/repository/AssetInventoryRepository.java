package com.mpbhms.backend.repository;

import com.mpbhms.backend.entity.AssetInventory;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AssetInventoryRepository extends JpaRepository<AssetInventory, Long> {
} 