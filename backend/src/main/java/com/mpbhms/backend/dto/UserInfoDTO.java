package com.mpbhms.backend.dto;

import com.mpbhms.backend.entity.UserInfoEntity;
import lombok.Data;

import java.time.Instant;

@Data
public class UserInfoDTO {
    private Long userId;
    private String fullName;
    private String phoneNumber;
    private String phoneNumber2;
    private UserInfoEntity.Gender gender;
    private Instant birthDate;
    private String birthPlace;
    private String nationalID;
    private String nationalIDIssuePlace;
    private String permanentAddress;
}
