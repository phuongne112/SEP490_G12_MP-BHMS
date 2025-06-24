package com.mpbhms.backend.dto;

import com.mpbhms.backend.validation.Phone;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.Instant;

@Data
public class UserInfoDtoRequest {
    @Size(min = 2, max = 100, message = "Full name must be between 2 and 100 characters")
    private String fullName;

    @Phone
    private String phoneNumber;

    @Phone
    private String phoneNumber2;
    private String gender;

    @Past(message = "Birth date must be in the past")
    private Instant birthDate;
    private String birthPlace;

    @Pattern(regexp = "^\\d{9}|\\d{12}$", message = "National ID must be 9 or 12 digits")
    private String nationalID;

    private String nationalIDIssuePlace;
    private String permanentAddress;
}
