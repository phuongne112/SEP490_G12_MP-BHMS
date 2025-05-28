package com.mpbhms.backend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

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
    @JoinColumn(name = "userId", nullable = false, unique = true)
    private UserEntity user;

    private String fullName;

    private String phoneNumber;

    private String phoneNumber2;

    @Enumerated(EnumType.STRING)
    private Gender gender;

    private Date birthDate;

    private String birthPlace;

    private String nationalID;

    private String nationalIDIssuePlace;
    @Lob
    private String permanentAddress;

    public enum Gender {
        Male, Female, Other
    }
}
