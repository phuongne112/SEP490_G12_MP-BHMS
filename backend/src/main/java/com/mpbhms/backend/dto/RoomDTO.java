package com.mpbhms.backend.dto;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class RoomDTO {
    private Long id;
    private String roomNumber;
    private BigDecimal area;
    private BigDecimal pricePerMonth;
    private String roomStatus; // Enum: Available, Occupied, Maintenance, Inactive
    private Integer numberOfBedrooms;
    private Integer numberOfBathrooms;
    private String description;
}
