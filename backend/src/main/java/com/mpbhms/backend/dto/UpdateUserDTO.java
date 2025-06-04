package com.mpbhms.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class UpdateUserDTO {
    private String username;
    private String email;
    private Boolean isActive;
    private Long roleId;     // ✅ thêm để cập nhật vai trò
}

