package com.mpbhms.backend.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
public class RoomDTO {
    private Long id;
    private String roomNumber;
    private BigDecimal area;
    private String roomStatus;
    private Double pricePerMonth;
    private Integer numberOfBedrooms;
    private Integer numberOfBathrooms;
    private String description;
    private Long landlordId;
    private String landlordName;
    private String landlordPhone;
    private List<RoomImageDTO> images;  // ✅ cần thiết
    private List<ServiceDTO> services;  // ✅ cần thiết
    private List<AssetDTO> assets;      // ✅ cần thiết
}

