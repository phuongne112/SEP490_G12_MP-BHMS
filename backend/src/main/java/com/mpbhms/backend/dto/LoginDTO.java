package com.mpbhms.backend.dto;

import com.mpbhms.backend.validation.Gmail;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class LoginDTO {
    @Size(max = 50)
    @Gmail
    public String username;

    @Size(max = 20)
    public String password;
}
