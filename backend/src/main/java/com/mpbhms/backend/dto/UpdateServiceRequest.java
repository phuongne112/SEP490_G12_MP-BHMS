package com.mpbhms.backend.dto;

import com.mpbhms.backend.enums.ServiceType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class UpdateServiceRequest {
    @NotBlank(message = "Vui lòng nhập tên dịch vụ")
    private String serviceName;
    
    @NotBlank(message = "Vui lòng nhập đơn vị")
    private String unit;
    
    @NotNull(message = "Vui lòng chọn loại dịch vụ")
    private ServiceType serviceType;
} 