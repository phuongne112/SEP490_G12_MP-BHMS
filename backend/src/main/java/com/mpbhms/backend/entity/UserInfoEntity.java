package com.mpbhms.backend.entity;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.util.Date;

@Entity
@Getter
@Setter
@Table(name = "UserInfo")
public class UserInfoEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long userInfoId;

    @OneToOne
    @JoinColumn(name = "user_id", nullable = false)
    private UserEntity user;

    @NotBlank(message = "Full name must not be empty")
    @Size(min = 2, max = 100, message = "Full name must be between 2 and 100 characters")
    private String fullName;

    private String phoneNumber;

    @Pattern(regexp = "^\\d{10}$", message = "Phone number must be 10 digits")
    private String phoneNumber2;

    @Enumerated(EnumType.STRING)
    private Gender gender;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss a", timezone = "GMT+7")
    private Instant birthDate;

    @Size(max = 200, message = "Birth place must not exceed 200 characters")
    private String birthPlace;

    @Pattern(regexp = "^\\d{9}|\\d{12}$", message = "National ID must be 9 or 12 digits")
    private String nationalID;

    @Size(max = 200, message = "National ID issue place must not exceed 200 characters")
    private String nationalIDIssuePlace;

    @Lob
    @Size(max = 500, message = "Permanent address must not exceed 500 characters")
    private String permanentAddress;

    public enum Gender {
        Male, Female, Other
    }
}
