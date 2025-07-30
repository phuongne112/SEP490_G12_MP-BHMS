package com.mpbhms.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import com.mpbhms.backend.dto.RenterRoomInfoDTO;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class UserDTO {
    private Long id;
    private String username;
    private String email;
    private Boolean isActive;
    private String createdBy;
    private Instant createdDate;
    private String updatedBy;
    private Instant updatedDate;
    private RoleUser role;
    private RenterRoomInfoDTO renterRoomInfo;
    private String fullName;
    private String phoneNumber;
    private UserInfoDTO userInfo;

    @Getter
    @Setter
    @AllArgsConstructor
    @NoArgsConstructor
    public static class RoleUser{
        private Long roleId;
        private String roleName;
    }

    @Getter
    @Setter
    @AllArgsConstructor
    @NoArgsConstructor
    public static class UserInfoDTO {
        private String fullName;
        private String phoneNumber;
        private String phoneNumber2;
        private String nationalID;
        private String permanentAddress;
        private String birthDate;
        private String birthPlace;
        private String nationalIDIssuePlace;
        private String nationalIDIssueDate;
        private String gender;
    }
}
