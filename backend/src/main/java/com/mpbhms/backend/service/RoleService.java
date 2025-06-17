package com.mpbhms.backend.service;

import com.mpbhms.backend.dto.ResultPaginationDTO;
import com.mpbhms.backend.entity.Role;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

import java.util.Optional;

public interface RoleService {
    boolean existByName(String name);
    Role createRole(Role role);
    boolean existsById(Long id);
    Role updateRole(Role role);
    void deleteRole(Long id);
    ResultPaginationDTO getAllRoles(Specification<Role> spec, Pageable pageable);
    Role getById(Long Id);
    Optional<Role> fetchRoleById(long id);
}
