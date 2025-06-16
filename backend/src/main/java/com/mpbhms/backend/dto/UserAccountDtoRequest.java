package com.mpbhms.backend.dto;

import lombok.Data;

@Data
public class UserAccountDtoRequest {
    private String email;
    private String username;
    private String password; // optional
}

