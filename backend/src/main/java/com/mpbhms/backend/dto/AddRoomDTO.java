package com.mpbhms.backend.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.List;

@Data
@Getter
@Setter
public class AddRoomDTO {
    private Long id;

    @NotBlank(message = "Room number is required")
    private String roomNumber;

    @NotNull(message = "Area is required")
    @DecimalMin(value = "0.1", message = "Area must be greater than 0")
    private BigDecimal area;

    @NotNull(message = "Price per month is required")
    @DecimalMin(value = "0.1", message = "Price per month must be greater than 0")
    private Double pricePerMonth;

    @NotBlank(message = "Room status is required")
    private String roomStatus;

    @NotNull(message = "Number of bedrooms is required")
    @Min(value = 1, message = "Number of bedrooms must be at least 1")
    private Integer numberOfBedrooms;

    @NotNull(message = "Number of bathrooms is required")
    @Min(value = 1, message = "Number of bathrooms must be at least 1")
    private Integer numberOfBathrooms;

    private String description;

    @NotNull(message = "Max occupants is required")
    @Min(value = 1, message = "Max occupants must be at least 1")
    private Integer maxOccupants;

    private Boolean isActive = true;

    private String building;
}
