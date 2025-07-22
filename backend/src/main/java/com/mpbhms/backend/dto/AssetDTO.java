package com.mpbhms.backend.dto;

import lombok.Data;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;

@Data
public class AssetDTO {
    private Long id;
    private String assetName;
    private BigDecimal quantity;
    private String conditionNote;
    private String assetImage;
    private Long roomId;
}

