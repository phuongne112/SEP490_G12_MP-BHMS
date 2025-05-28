package com.mpbhms.backend.dto;

import lombok.Data;

@Data
public class CreateUserDTO {
    public String username;
    public String email;
    public String password;
}
