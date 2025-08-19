package com.mpbhms.backend.repository;

import com.mpbhms.backend.entity.AssetInventory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Map;

public interface AssetInventoryRepository extends JpaRepository<AssetInventory, Long> {
    List<AssetInventory> findByRoomNumber(String roomNumber);
    List<AssetInventory> findByRoomNumberAndContractId(String roomNumber, Long contractId);
    boolean existsByAssetIdAndContractIdAndType(Long assetId, Long contractId, String type);
    
    @Query(value = """
        SELECT ai.id, ai.asset_id as assetId, a.asset_name as assetName, 
               ai.room_number as roomNumber, ai.contract_id as contractId,
               ai.status, ai.is_enough as isEnough, ai.note, ai.created_at as createdAt,
               ai.type, ai.photo_urls as photoUrls
        FROM asset_inventory ai 
        LEFT JOIN assets a ON ai.asset_id = a.id 
        WHERE ai.room_number = :roomNumber AND ai.contract_id = :contractId
        ORDER BY ai.created_at DESC
    """, nativeQuery = true)
    List<Map<String, Object>> findAssetInventoryWithAssetNameByRoomAndContract(
        @Param("roomNumber") String roomNumber, 
        @Param("contractId") Long contractId
    );
} 