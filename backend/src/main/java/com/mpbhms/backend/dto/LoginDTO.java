package com.mpbhms.backend.dto;

import com.mpbhms.backend.validation.Gmail;
import com.mpbhms.backend.validation.Password;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class LoginDTO {
    @Size(max = 50)
    @Gmail
    public String username;

    @Size(max = 20, message="Mật khẩu phải từ 20 ký tự")
    @Password
    public String password;
}
