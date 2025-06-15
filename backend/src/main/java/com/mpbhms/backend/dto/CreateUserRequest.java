package com.mpbhms.backend.dto;

import com.mpbhms.backend.validation.Gmail;
import com.mpbhms.backend.validation.Password;
import com.mpbhms.backend.validation.Phone;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CreateUserRequest {
    @Size(min = 3, max = 50, message = "Username must be between 3 and 50 characters")
    private String username;

    @Size(min = 2, max = 100, message = "Full name must be between 2 and 100 characters")
    private String fullName;

    @Gmail
    private String email;

    @Phone
    private String phone;

    @Password
    private String password;
}

