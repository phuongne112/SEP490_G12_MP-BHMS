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
    private Boolean isActive;
    private Integer maxOccupants;
    private List<RoomImageDTO> images;
    private List<ServiceDTO> services;
    private List<AssetDTO> assets;
    private String building;
    private boolean hasActiveContract;
    private List<RoomUserDTO> roomUsers;
}

