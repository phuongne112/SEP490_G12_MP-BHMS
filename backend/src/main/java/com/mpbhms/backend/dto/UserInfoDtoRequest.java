package com.mpbhms.backend.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.Instant;

@Data
public class UserInfoDtoRequest {
    @Size(min = 2, max = 100, message = "Full name must be between 2 and 100 characters")
    private String fullName;

    @Pattern(regexp = "^\\d{10}$", message = "Phone number must be 10 digits")
    private String phoneNumber;

    @Pattern(regexp = "^\\d{10}$", message = "Secondary phone number must be 10 digits")
    private String phoneNumber2;
    private String gender;
    private Instant birthDate;
    private String birthPlace;

    @Pattern(regexp = "^\\d{9}|\\d{12}$", message = "National ID must be 9 or 12 digits")
    private String nationalID;

    private String nationalIDIssuePlace;
    private String permanentAddress;
}
