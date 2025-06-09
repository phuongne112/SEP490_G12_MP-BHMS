package com.mpbhms.backend.dto;

import lombok.Data;

@Data
public class CreateUserRequest {
    private String username;
    private String fullName;
    private String email;
    private String phone;
    private String password;
}
