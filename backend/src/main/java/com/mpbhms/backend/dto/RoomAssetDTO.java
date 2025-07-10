package com.mpbhms.backend.dto;

import lombok.Data;

@Data
public class RoomAssetDTO {
    private Long id;
    private Long assetId;
    private String assetName;
    private Long roomId;
    private Integer quantity;
    private String status;
    private String note;
} 