package com.mpbhms.backend.dto;

import com.mpbhms.backend.validation.Password;
import lombok.Data;

@Data
public class ResetPasswordDTO {
    private String token;

    @Password
    private String newPassword;
}
