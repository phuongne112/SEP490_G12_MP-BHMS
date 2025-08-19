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
import java.util.Map;

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
            // Chặn checkin/checkout nhiều lần cho cùng asset + contract + type
            if (assetInventoryRepository.existsByAssetIdAndContractIdAndType(req.getAssetId(), req.getContractId(), req.getType())) {
                throw new RuntimeException("Tài sản đã được kiểm kê " + req.getType().toLowerCase() + " cho hợp đồng này!");
            }
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
            if (req.getPhotoUrls() != null && !req.getPhotoUrls().isEmpty()) {
                entity.setPhotoUrls(String.join(",", req.getPhotoUrls()));
            }
            assetInventoryRepository.save(entity);
        }
    }

    @Override
    public List<AssetInventory> getAssetsByRoomNumber(String roomNumber) {
        return assetInventoryRepository.findByRoomNumber(roomNumber);
    }

    @Override
    public List<AssetInventory> getAssetsByRoomNumberAndContractId(String roomNumber, Long contractId) {
        return assetInventoryRepository.findByRoomNumberAndContractId(roomNumber, contractId);
    }

    @Override
    public List<Map<String, Object>> getAssetInventoryWithAssetNameByRoomAndContract(String roomNumber, Long contractId) {
        return assetInventoryRepository.findAssetInventoryWithAssetNameByRoomAndContract(roomNumber, contractId);
    }
} 