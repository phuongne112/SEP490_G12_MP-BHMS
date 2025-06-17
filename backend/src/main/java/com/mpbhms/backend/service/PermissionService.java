package com.mpbhms.backend.service;

import com.mpbhms.backend.dto.ResultPaginationDTO;
import com.mpbhms.backend.entity.Permission;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

public interface PermissionService {
    boolean isPermission(Permission permission);
    Permission createPermission(Permission permission);
    Permission getById(Long Id);
    Permission updatePermission(Permission permission);
     void deletePermission(Long Id);
    ResultPaginationDTO getAllPermissions(Specification<Permission> spec, Pageable pageable);
    boolean isSameName(Permission permission);
}
