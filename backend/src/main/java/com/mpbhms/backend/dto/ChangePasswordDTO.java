package com.mpbhms.backend.dto;

import lombok.Data;

@Data
public class ChangePasswordDTO {
    public String currentPassword;
    public String newPassword;
}
