package com.mpbhms.backend.entity;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@Entity
@Getter
@Setter
@Table(name = "permissions")
@NoArgsConstructor
public class PermissionEntity extends BaseEntity {
    private String name;
    private String apiPath;
    private String method;
    private String module;

    @ManyToMany(fetch = FetchType.LAZY, mappedBy = "permissionEntities")
    @JsonIgnore
    private List<RoleEntity> roleEntities;

    public PermissionEntity(String name, String apiPath, String method, String module) {
        this.name = name;
        this.apiPath = apiPath;
        this.method = method;
        this.module = module;
    }
}

