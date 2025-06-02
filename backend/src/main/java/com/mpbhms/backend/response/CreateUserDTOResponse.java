package com.mpbhms.backend.response;

import lombok.Data;

import java.time.Instant;

@Data
public class CreateUserDTOResponse {
    private Long id;
    private String username;
    private String email;
    private Boolean isActive;
    private Instant createdDate;
    private Instant updatedDate;
}
