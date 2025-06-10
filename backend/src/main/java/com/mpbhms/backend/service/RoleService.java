package com.mpbhms.backend.service;

import com.mpbhms.backend.dto.ResultPaginationDTO;
import com.mpbhms.backend.entity.PermissionEntity;
import com.mpbhms.backend.entity.RoleEntity;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

import java.util.Optional;

public interface RoleService {
    boolean existByName(String name);
    RoleEntity createRole(RoleEntity roleEntity);
    boolean existsById(Long id);
    RoleEntity updateRole(RoleEntity roleEntity);
    void deleteRole(Long id);
    ResultPaginationDTO getAllRoles(Specification<RoleEntity> spec, Pageable pageable);
    RoleEntity getById(Long Id);
    Optional<RoleEntity> fetchRoleById(long id);
}
