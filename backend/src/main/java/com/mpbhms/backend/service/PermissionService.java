package com.mpbhms.backend.service;

import com.mpbhms.backend.dto.ResultPaginationDTO;
import com.mpbhms.backend.entity.PermissionEntity;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

import java.security.Permission;

public interface PermissionService {
    boolean isPermission(PermissionEntity permission);
    PermissionEntity addPermission(PermissionEntity permission);
    PermissionEntity getById(Long Id);
    PermissionEntity updatePermission(PermissionEntity permission);
     void deletePermission(Long Id);
    ResultPaginationDTO getAllPermissions(Specification<PermissionEntity> spec, Pageable pageable);
    boolean isSameName(PermissionEntity permission);
}
