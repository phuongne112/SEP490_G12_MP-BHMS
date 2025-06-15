package com.mpbhms.backend.dto;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class AssetDTO {
    private Long id;
    private String assetName;
    private BigDecimal quantity;
    private String conditionNote;
    private String assetStatus;
    private String assetImage;
}

