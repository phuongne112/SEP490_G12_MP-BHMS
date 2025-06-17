package com.mpbhms.backend.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class PermissionRequestDTO {
    private Long id; // <-- để phục vụ update

    @NotBlank(message = "Permission name is required")
    private String name;

    @NotBlank(message = "API path is required")
    private String apiPath;

    @NotBlank(message = "HTTP method is required")
    private String method;

    @NotBlank(message = "Module is required")
    private String module;
}

