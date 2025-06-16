package com.mpbhms.backend.dto;

import com.mpbhms.backend.validation.Gmail;
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
    private Long id;

    @Size(min = 3, max = 50, message = "Username must be between 3 and 50 characters")
    private String username;

    @Gmail
    private String email;

    private Boolean isActive;

    private RoleDTO role;

    @Getter
    @Setter
    public static class RoleDTO {
        private Long roleId;
    }
}

