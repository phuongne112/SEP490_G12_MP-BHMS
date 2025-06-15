package com.mpbhms.backend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class UpdateUserDTO {
    @Size(min = 3, max = 50, message = "Username must be between 3 and 50 characters")
    private String username;
    @Email
    private String email;
    private Boolean isActive;
    private Long roleId;
}

