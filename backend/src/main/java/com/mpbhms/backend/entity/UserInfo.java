package com.mpbhms.backend.entity;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.mpbhms.backend.enums.Gender;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

@Entity
@Getter
@Setter
@Table(name = "UserInfo")
public class UserInfo {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long userInfoId;

    @OneToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @NotBlank(message = "Full name must not be empty")
    @Size(min = 2, max = 100, message = "Họ tên phải từ 2 đến 100 ký tự")
    private String fullName;

    private String phoneNumber;

    @Pattern(regexp = "^\\d{10}$", message = "Số điện thoại phải có 10 chữ số")
    private String phoneNumber2;

    @Enumerated(EnumType.STRING)
    private Gender gender;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss a", timezone = "GMT+7")
    private Instant birthDate;

    @Size(max = 200, message = "Nơi sinh phải không vượt quá 200 ký tự")
    private String birthPlace;

    @Pattern(regexp = "^\\d{9}|\\d{12}$", message = "Số CMND phải có 9 hoặc 12 chữ số")
    private String nationalID;

    @Size(max = 200, message = "Nơi cấp CMND phải không vượt quá 200 ký tự")
    private String nationalIDIssuePlace;

    @Lob
    @Size(max = 500, message = "Địa chỉ thường trú phải không vượt quá 500 ký tự")
    private String permanentAddress;

}
