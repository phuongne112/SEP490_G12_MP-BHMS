package com.mpbhms.backend.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;

import java.time.Instant;

@Data
public class UserInfoDtoResponse {
    private String fullName;
    private String phoneNumber;
    private String phoneNumber2;
    private String gender;
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss a",timezone = "GMT+7")
    private Instant birthDate;
    private String birthPlace;
    private String nationalID;
    private String nationalIDIssuePlace;
    private String permanentAddress;
}
