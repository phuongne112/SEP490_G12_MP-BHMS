package com.mpbhms.backend.dto;

import com.mpbhms.backend.enums.ServiceType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class CreateServiceRequest {
    @NotBlank(message = "Vui lòng nhập tên dịch vụ")
    private String serviceName;
    
    @NotBlank(message = "Vui lòng nhập đơn vị")
    private String unit;
    
    @NotNull(message = "Vui lòng nhập giá mỗi đơn vị")
    @Positive(message = "Giá mỗi đơn vị phải là số dương")
    private BigDecimal unitPrice;
    
    @NotNull(message = "Vui lòng chọn loại dịch vụ")
    private ServiceType serviceType;
} 