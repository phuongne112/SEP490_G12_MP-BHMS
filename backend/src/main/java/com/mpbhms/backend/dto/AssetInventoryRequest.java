package com.mpbhms.backend.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AssetInventoryRequest {
    private Long assetId;
    private String roomNumber;
    private Long contractId;
    private String status; // "Good", "Broken", "Lost", "Maintenance"
    private Boolean isEnough;
    private String note;
    private String type; // "CHECKIN" hoặc "CHECKOUT"
} 