package com.mpbhms.backend.service.impl;

import com.mpbhms.backend.dto.AssetInventoryRequest;
import com.mpbhms.backend.entity.AssetInventory;
import com.mpbhms.backend.entity.User;
import com.mpbhms.backend.repository.AssetInventoryRepository;
import com.mpbhms.backend.repository.UserRepository;
import com.mpbhms.backend.service.AssetInventoryService;
import com.mpbhms.backend.util.CurrentUserUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AssetInventoryServiceImpl implements AssetInventoryService {
    private final AssetInventoryRepository assetInventoryRepository;
    private final UserRepository userRepository;

    @Override
    public void saveCheckinAssets(List<AssetInventoryRequest> requestList) {
        String username = CurrentUserUtil.getCurrentUserLogin().orElse(null);
        User user = userRepository.findByUsername(username);
        for (AssetInventoryRequest req : requestList) {
            AssetInventory entity = new AssetInventory();
            entity.setAssetId(req.getAssetId());
            entity.setRoomNumber(req.getRoomNumber());
            entity.setContractId(req.getContractId());
            entity.setUser(user);
            entity.setStatus(req.getStatus());
            entity.setIsEnough(req.getIsEnough());
            entity.setNote(req.getNote());
            entity.setCreatedAt(Instant.now());
            entity.setType(req.getType());
            assetInventoryRepository.save(entity);
        }
    }
} 