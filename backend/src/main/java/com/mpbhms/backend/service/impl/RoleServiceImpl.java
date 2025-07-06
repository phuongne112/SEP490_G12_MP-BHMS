package com.mpbhms.backend.service.impl;

import com.mpbhms.backend.dto.Meta;
import com.mpbhms.backend.dto.ResultPaginationDTO;
import com.mpbhms.backend.entity.Permission;
import com.mpbhms.backend.entity.Role;
import com.mpbhms.backend.exception.BusinessException;
import com.mpbhms.backend.exception.IdInvalidException;
import com.mpbhms.backend.repository.PermissionRepository;
import com.mpbhms.backend.repository.RoleRepository;
import com.mpbhms.backend.service.RoleService;
import lombok.AllArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@AllArgsConstructor
public class RoleServiceImpl implements RoleService {

    private final RoleRepository roleRepository;
    private final PermissionRepository permissionRepository;
    @Override
    public boolean existByName(String name) {
        return this.roleRepository.existsByRoleName(name);
    }
    @Override
    public Role createRole(Role role) {
        // Kiểm tra tên role đã tồn tại chưa
        if (existByName(role.getRoleName())) {
            throw new BusinessException("Tên vai trò '" + role.getRoleName() + "' đã tồn tại.");
        }

        // Gán lại danh sách permission nếu có
        if (role.getPermissionEntities() != null && !role.getPermissionEntities().isEmpty()) {
            List<Long> permissionIds = role.getPermissionEntities().stream()
                    .map(Permission::getId)
                    .collect(Collectors.toList());

            List<Permission> dbPermissions = permissionRepository.findByIdIn(permissionIds);
            role.setPermissionEntities(dbPermissions);
        }

        return roleRepository.save(role);
    }

    @Override
    public boolean existsById(Long id) {
        return roleRepository.existsById(id);
    }


    @Override
    public Role updateRole(Role role) {
        // Kiểm tra id tồn tại
        Role roleDB = roleRepository.findById(role.getId())
                .orElseThrow(() -> new IdInvalidException("Không tìm thấy vai trò với ID = " + role.getId()));

        // Kiểm tra trùng tên role nếu tên bị đổi
        if (!roleDB.getRoleName().equals(role.getRoleName())
                && roleRepository.existsByRoleName(role.getRoleName())) {
            throw new BusinessException("Tên vai trò '" + role.getRoleName() + "' đã tồn tại.");
        }

        // Gán lại permission nếu có
        if (role.getPermissionEntities() != null && !role.getPermissionEntities().isEmpty()) {
            List<Long> permissionIds = role.getPermissionEntities().stream()
                    .map(Permission::getId)
                    .collect(Collectors.toList());

            List<Permission> dbPermissions = permissionRepository.findByIdIn(permissionIds);
            roleDB.setPermissionEntities(dbPermissions);
        } else {
            roleDB.setPermissionEntities(new ArrayList<>());
        }

        // Cập nhật tên role
        roleDB.setRoleName(role.getRoleName());

        return roleRepository.save(roleDB);
    }


    @Override
    public void deleteRole(Long id) {
        Role role = roleRepository.findById(id)
                .orElseThrow(() -> new IdInvalidException("Không tìm thấy vai trò với ID " + id));

        try {
            roleRepository.delete(role);
        } catch (DataIntegrityViolationException ex) {
            throw new BusinessException("Vai trò này vẫn đang được gán cho người dùng và không thể xóa.");
        }
    }



    @Override
    public ResultPaginationDTO getAllRoles(Specification<Role> spec, Pageable pageable) {
        Page<Role> page = roleRepository.findAll(spec, pageable);

        Meta meta = new Meta();
        meta.setPage(page.getNumber() + 1);
        meta.setPageSize(page.getSize());
        meta.setPages(page.getTotalPages());
        meta.setTotal(page.getTotalElements());

        ResultPaginationDTO result = new ResultPaginationDTO();
        result.setMeta(meta);
        result.setResult(page.getContent());

        return result;
    }
    @Override
    public Role getById(Long Id) {
        Optional<Role> roleEntity = this.roleRepository.findById(Id);
        if (roleEntity.isPresent()) {
            return roleEntity.get();
        }
        return null;
    }
    public Optional<Role> fetchRoleById(long id) {
        return this.roleRepository.findById(id);
    }

}
