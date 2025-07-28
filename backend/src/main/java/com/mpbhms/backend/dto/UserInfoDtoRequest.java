package com.mpbhms.backend.dto;

import com.mpbhms.backend.validation.Phone;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.Instant;

@Data
public class UserInfoDtoRequest {
    @Size(min = 2, max = 100, message = "Họ tên phải từ 2 đến 100 ký tự")
    private String fullName;

    @Phone
    private String phoneNumber;

    @Phone
    private String phoneNumber2;
    private String gender;

    @Past(message = "Ngày sinh phải trước ngày hiện tại")
    private java.time.LocalDate birthDate;
    private String birthPlace;

    @Pattern(regexp = "^\\d{9}|\\d{12}$", message = "Số CMND phải có 9 hoặc 12 chữ số")
    private String nationalID;

    private String nationalIDIssuePlace;
    
    @Past(message = "Ngày cấp phải trước ngày hiện tại")
    private java.time.LocalDate nationalIDIssueDate;
    
    private String permanentAddress;
}
