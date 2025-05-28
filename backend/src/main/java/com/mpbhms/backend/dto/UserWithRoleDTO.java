package com.mpbhms.backend.dto;
import lombok.*;
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
    private Date createdDate;
    private String updatedBy;
    private Date updatedDate;
    private String roleName;
    private Date assignedAt;
}
