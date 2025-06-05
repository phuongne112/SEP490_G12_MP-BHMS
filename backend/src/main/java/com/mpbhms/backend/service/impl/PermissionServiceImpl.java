package com.mpbhms.backend.service.impl;

import com.mpbhms.backend.dto.Meta;
import com.mpbhms.backend.dto.PermissionDTO;
import com.mpbhms.backend.dto.ResultPaginationDTO;
import com.mpbhms.backend.entity.PermissionEntity;
import com.mpbhms.backend.entity.RoleEntity;
import com.mpbhms.backend.exception.ResourceNotFoundException;
import com.mpbhms.backend.repository.PermissionRepository;
import com.mpbhms.backend.service.PermissionService;
import lombok.AllArgsConstructor;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

import java.security.Permission;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class PermissionServiceImpl implements PermissionService {

    private final PermissionRepository permissionRepository;
    @Override
    public boolean isPermission(PermissionEntity permission) {
        return this.permissionRepository.existsByModuleAndApiPathAndMethod(
                permission.getModule(),
                permission.getApiPath(),
                permission.getMethod()
        );
    }

    @Override
    public PermissionEntity addPermission(PermissionEntity permission) {
        return this.permissionRepository.save(permission);
    }

    @Override
    public PermissionEntity getById(Long Id) {
        Optional<PermissionEntity> permission = this.permissionRepository.findById(Id);
        if (permission.isPresent()) {
            return permission.get();
        }
        return null;
    }

    @Override
    public PermissionEntity updatePermission(PermissionEntity permission) {
        PermissionEntity permissionEntityDB = this.getById(permission.getId());
        if (permissionEntityDB != null) {
            permissionEntityDB.setName(permission.getName());
            permissionEntityDB.setApiPath(permission.getApiPath());
            permissionEntityDB.setMethod(permission.getMethod());
            permissionEntityDB.setModule(permission.getModule());

            permissionEntityDB = this.permissionRepository.save(permissionEntityDB);
            return permissionEntityDB;
        }
        return null;
    }

    @Override
    public void deletePermission(Long Id) {
        PermissionEntity permission = permissionRepository.findById(Id)
                .orElseThrow(() -> new ResourceNotFoundException("Permission không tồn tại với ID: " + Id));

        // Xóa quan hệ giữa permission và role
        for (RoleEntity role : permission.getRoleEntities()) {
            role.getPermissionEntities().remove(permission);
        }

        // Xóa permission
        permissionRepository.delete(permission);
    }
    @Override
    public ResultPaginationDTO getAllPermissions(Specification<PermissionEntity> spec, Pageable pageable) {
        Page<PermissionEntity> page = permissionRepository.findAll(spec, pageable);
        List<PermissionDTO> dtoList = page.getContent().stream()
                .map(this::convertToDTO)
                .toList();

        Meta meta = new Meta();
        meta.setPage(page.getNumber() + 1);
        meta.setPageSize(page.getSize());
        meta.setPages(page.getTotalPages());
        meta.setTotal(page.getTotalElements());

        ResultPaginationDTO result = new ResultPaginationDTO();
        result.setMeta(meta);
        result.setResult(dtoList);
        return result;
    }
    private PermissionDTO convertToDTO(PermissionEntity entity) {
        PermissionDTO dto = new PermissionDTO();
        dto.setId(entity.getId()); // hoặc entity.getPermissionId() nếu tên khác
        dto.setName(entity.getName());
        dto.setApiPath(entity.getApiPath());
        dto.setMethod(entity.getMethod());
        dto.setModule(entity.getModule());
        return dto;
    }

    public boolean isSameName(PermissionEntity permission) {
        return this.permissionRepository.existsByName(permission.getName());
    }
}
