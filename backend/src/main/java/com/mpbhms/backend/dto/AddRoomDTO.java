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

    @NotBlank(message = "Vui lòng nhập số phòng")
    private String roomNumber;

    @NotNull(message = "Vui lòng nhập diện tích")
    @DecimalMin(value = "0.1", message = "Diện tích phải lớn hơn 0")
    private BigDecimal area;

    @NotNull(message = "Vui lòng nhập giá thuê mỗi tháng")
    @DecimalMin(value = "0.1", message = "Giá thuê mỗi tháng phải lớn hơn 0")
    private Double pricePerMonth;

    @NotBlank(message = "Vui lòng chọn trạng thái phòng")
    private String roomStatus;

    @NotNull(message = "Vui lòng nhập số phòng ngủ")
    @Min(value = 1, message = "Số phòng ngủ tối thiểu là 1")
    private Integer numberOfBedrooms;

    @NotNull(message = "Vui lòng nhập số phòng tắm")
    @Min(value = 1, message = "Số phòng tắm tối thiểu là 1")
    private Integer numberOfBathrooms;

    private String description;

    @NotNull(message = "Vui lòng nhập số người tối đa")
    @Min(value = 1, message = "Số người tối đa tối thiểu là 1")
    private Integer maxOccupants;

    private Boolean isActive = true;

    private String building;
}
