package com.mpbhms.backend.dto;

import lombok.Data;

import java.time.Instant;

@Data
public class UserInfoDtoResponse {
    private String fullName;
    private String phoneNumber;
    private String phoneNumber2;
    private String gender;
    private Instant birthDate;
    private String birthPlace;
    private String nationalID;
    private String nationalIDIssuePlace;
    private String permanentAddress;
}
