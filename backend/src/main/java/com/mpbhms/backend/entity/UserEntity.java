package com.mpbhms.backend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Getter
@Setter
@Table(name = "Users")
public class UserEntity extends BaseEntity {
    @Column( nullable = false, unique = true)
    private String username;

    @Column(nullable = false)
    private String password;

    @Column(nullable = false, unique = true)
    private String email;

    private Boolean isActive = true;

    @OneToOne(mappedBy = "user", cascade = CascadeType.ALL)
    private UserInfoEntity userInfo;


    @OneToOne(mappedBy = "user", cascade = CascadeType.ALL)
    private UserRoleEntity userRoles ;
}
