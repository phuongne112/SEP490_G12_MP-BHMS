package com.mpbhms.backend.response;

import lombok.Data;
import java.math.BigDecimal;

@Data
public class AddRoomDTOResponse {
    private Long id;
    private String roomNumber;
    private BigDecimal area;
    private Double pricePerMonth;
    private String roomStatus;
    private Integer numberOfBedrooms;
    private Integer numberOfBathrooms;
    private String description;
    private Integer maxOccupants;
    private String building;

    public Integer getMaxOccupants() { return maxOccupants; }
    public void setMaxOccupants(Integer maxOccupants) { this.maxOccupants = maxOccupants; }
} 