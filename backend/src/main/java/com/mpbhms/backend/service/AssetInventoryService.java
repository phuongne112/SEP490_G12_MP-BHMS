package com.mpbhms.backend.service;

import com.mpbhms.backend.dto.AssetInventoryRequest;
import com.mpbhms.backend.entity.AssetInventory;
import java.util.List;
 
public interface AssetInventoryService {
    void saveCheckinAssets(List<AssetInventoryRequest> requestList);
    List<AssetInventory> getAssetsByRoomNumber(String roomNumber);
    List<AssetInventory> getAssetsByRoomNumberAndContractId(String roomNumber, Long contractId);
} 