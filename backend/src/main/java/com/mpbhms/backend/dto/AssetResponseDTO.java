package com.mpbhms.backend.dto;

import lombok.Data;
import java.math.BigDecimal;

@Data
public class AssetResponseDTO {
    private Long id;
    private String assetName;
    private BigDecimal quantity;
    private String conditionNote;
    private String assetImage;
    private Long roomId;
} 