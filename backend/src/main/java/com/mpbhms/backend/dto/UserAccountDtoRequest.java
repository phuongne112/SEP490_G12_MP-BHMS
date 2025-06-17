package com.mpbhms.backend.dto;

import com.mpbhms.backend.validation.Gmail;
import com.mpbhms.backend.validation.Password;
import lombok.Data;

@Data
public class UserAccountDtoRequest {
    @Gmail
    private String email;
    private String username;
    private String password; // optional
}

