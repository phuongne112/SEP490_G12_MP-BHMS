package com.mpbhms.backend.dto;

import lombok.Data;

import java.time.Instant;

@Data
public class CreateUserDTO {
    private String username;
    private String email;
    private Boolean isActive;
    private Instant createdDate;
    private Long roleId;

}
