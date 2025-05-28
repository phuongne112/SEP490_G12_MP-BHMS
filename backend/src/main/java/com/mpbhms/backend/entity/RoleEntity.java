package com.mpbhms.backend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@Entity
@Getter
@Setter
@Table(name = "Roles")
public class RoleEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long roleId;

    @Column( length = 255, nullable = false, unique = true)
    private String roleName;


    @OneToMany(mappedBy = "role", cascade = CascadeType.ALL)
    private List<UserRoleEntity> userRoles = new ArrayList<>();
}
