package com.mpbhms.backend.service;

import com.mpbhms.backend.dto.AssetInventoryRequest;
import java.util.List;

public interface AssetInventoryService {
    void saveCheckinAssets(List<AssetInventoryRequest> requestList);
} 