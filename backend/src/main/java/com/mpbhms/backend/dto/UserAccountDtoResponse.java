package com.mpbhms.backend.dto;

import lombok.Data;

@Data
public class UserAccountDtoResponse {
    private Long id;
    private String username;
    private String email;
    private String fullName;
}
