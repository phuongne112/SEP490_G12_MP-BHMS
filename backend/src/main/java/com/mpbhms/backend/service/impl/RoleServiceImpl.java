package com.mpbhms.backend.service.impl;

import com.mpbhms.backend.dto.Meta;
import com.mpbhms.backend.dto.ResultPaginationDTO;
import com.mpbhms.backend.entity.PermissionEntity;
import com.mpbhms.backend.entity.RoleEntity;
import com.mpbhms.backend.exception.IdInvalidException;
import com.mpbhms.backend.repository.PermissionRepository;
import com.mpbhms.backend.repository.RoleRepository;
import com.mpbhms.backend.service.RoleService;
import lombok.AllArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

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
    public RoleEntity createRole(RoleEntity roleEntity) {
        // Kiểm tra và gán permission nếu có
        if (roleEntity.getPermissionEntities() != null && !roleEntity.getPermissionEntities().isEmpty()) {
            List<Long> permissionIds = roleEntity.getPermissionEntities().stream()
                    .map(PermissionEntity::getId)
                    .collect(Collectors.toList()); // đúng cú pháp

            List<PermissionEntity> dbPermissions = permissionRepository.findByIdIn(permissionIds);
            roleEntity.setPermissionEntities(dbPermissions); // gán lại danh sách từ DB
        }

        return roleRepository.save(roleEntity);
    }
    @Override
    public boolean existsById(Long id) {
        return roleRepository.existsById(id);
    }


    @Override
    public RoleEntity updateRole(RoleEntity roleEntity) {
        // Lấy role từ DB
        RoleEntity roleDB = roleRepository.findById(roleEntity.getRoleId())
                .orElseThrow(() -> new IdInvalidException("Role với id = " + roleEntity.getRoleId() + " không tồn tại."));

        // Kiểm tra và cập nhật danh sách permission
        if (roleEntity.getPermissionEntities() != null && !roleEntity.getPermissionEntities().isEmpty()) {
            List<Long> permissionIds = roleEntity.getPermissionEntities().stream()
                    .map(PermissionEntity::getId)
                    .collect(Collectors.toList());

            List<PermissionEntity> dbPermissions = permissionRepository.findByIdIn(permissionIds);
            roleDB.setPermissionEntities(dbPermissions); // gán permission từ DB vào role gốc
        }

        // Cập nhật các trường cơ bản
        roleDB.setRoleName(roleEntity.getRoleName());

        return roleRepository.save(roleDB);
    }

    @Override
    public void deleteRole(Long id) {
        roleRepository.deleteById(id);
    }
    @Override
    public ResultPaginationDTO getAllRoles(Specification<RoleEntity> spec, Pageable pageable) {
        Page<RoleEntity> page = roleRepository.findAll(spec, pageable);

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
    public RoleEntity getById(Long Id) {
        Optional<RoleEntity> roleEntity = this.roleRepository.findById(Id);
        if (roleEntity.isPresent()) {
            return roleEntity.get();
        }
        return null;
    }
    public Optional<RoleEntity> fetchRoleById(long id) {
        return this.roleRepository.findById(id);
    }

    @Override
    public RoleEntity findRoleByName(String roleName) {
        return this.roleRepository.findByRoleName(roleName);
    }
}
