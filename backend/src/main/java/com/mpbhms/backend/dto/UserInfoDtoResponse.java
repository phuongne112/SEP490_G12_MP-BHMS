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
    @JsonFormat(pattern = "yyyy-MM-dd",timezone = "GMT+7")
    private java.time.LocalDate birthDate;
    private String birthPlace;
    private String nationalID;
    private String nationalIDIssuePlace;
    
    @JsonFormat(pattern = "yyyy-MM-dd",timezone = "GMT+7")
    private java.time.LocalDate nationalIDIssueDate;
    
    private String permanentAddress;
}
