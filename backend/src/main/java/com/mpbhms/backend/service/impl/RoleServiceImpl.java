package com.mpbhms.backend.service.impl;

import com.mpbhms.backend.dto.Meta;
import com.mpbhms.backend.dto.ResultPaginationDTO;
import com.mpbhms.backend.entity.PermissionEntity;
import com.mpbhms.backend.entity.RoleEntity;
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
    public RoleEntity createRole(RoleEntity roleEntity) {
        // Kiểm tra tên role đã tồn tại chưa
        if (existByName(roleEntity.getRoleName())) {
            throw new BusinessException("Role with name " + roleEntity.getRoleName() + " already exists.");
        }

        // Gán lại danh sách permission nếu có
        if (roleEntity.getPermissionEntities() != null && !roleEntity.getPermissionEntities().isEmpty()) {
            List<Long> permissionIds = roleEntity.getPermissionEntities().stream()
                    .map(PermissionEntity::getId)
                    .collect(Collectors.toList());

            List<PermissionEntity> dbPermissions = permissionRepository.findByIdIn(permissionIds);
            roleEntity.setPermissionEntities(dbPermissions);
        }

        return roleRepository.save(roleEntity);
    }

    @Override
    public boolean existsById(Long id) {
        return roleRepository.existsById(id);
    }


    @Override
    public RoleEntity updateRole(RoleEntity roleEntity) {
        // Kiểm tra id tồn tại
        RoleEntity roleDB = roleRepository.findById(roleEntity.getId())
                .orElseThrow(() -> new IdInvalidException("Role with id = " + roleEntity.getId() + " not found."));

        // Kiểm tra trùng tên role nếu tên bị đổi
        if (!roleDB.getRoleName().equals(roleEntity.getRoleName())
                && roleRepository.existsByRoleName(roleEntity.getRoleName())) {
            throw new BusinessException("Role with name '" + roleEntity.getRoleName() + "' already exists.");
        }

        // Gán lại permission nếu có
        if (roleEntity.getPermissionEntities() != null && !roleEntity.getPermissionEntities().isEmpty()) {
            List<Long> permissionIds = roleEntity.getPermissionEntities().stream()
                    .map(PermissionEntity::getId)
                    .collect(Collectors.toList());

            List<PermissionEntity> dbPermissions = permissionRepository.findByIdIn(permissionIds);
            roleDB.setPermissionEntities(dbPermissions);
        } else {
            roleDB.setPermissionEntities(new ArrayList<>());
        }

        // Cập nhật tên role
        roleDB.setRoleName(roleEntity.getRoleName());

        return roleRepository.save(roleDB);
    }


    @Override
    public void deleteRole(Long id) {
        RoleEntity role = roleRepository.findById(id)
                .orElseThrow(() -> new IdInvalidException("Role with id " + id + " does not exist"));

        try {
            roleRepository.delete(role);
        } catch (DataIntegrityViolationException ex) {
            throw new BusinessException("This role is still assigned to users and cannot be deleted.");
        }
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

}
