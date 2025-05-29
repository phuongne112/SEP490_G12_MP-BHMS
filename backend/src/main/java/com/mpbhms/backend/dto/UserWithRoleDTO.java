package com.mpbhms.backend.dto;
import lombok.*;

import java.time.Instant;
import java.util.Date;

@AllArgsConstructor
@NoArgsConstructor
@Getter
@Setter
public class UserWithRoleDTO {
    private Long userId;
    private String username;
    private String email;
    private Boolean isActive;
    private String createdBy;
    private Instant createdDate;
    private String updatedBy;
    private Instant updatedDate;
    private String roleName;
    private Date assignedAt;
}
