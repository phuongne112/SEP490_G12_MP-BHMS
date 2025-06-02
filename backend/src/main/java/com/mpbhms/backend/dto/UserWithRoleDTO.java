package com.mpbhms.backend.dto;
import lombok.*;

import java.time.Instant;
import java.util.Date;
@AllArgsConstructor
@Getter
@Setter
public class UserWithRoleDTO {
    private Long id;
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
