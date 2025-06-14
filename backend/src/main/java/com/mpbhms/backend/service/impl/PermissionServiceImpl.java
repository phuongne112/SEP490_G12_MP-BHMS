package com.mpbhms.backend.service.impl;

import com.mpbhms.backend.dto.Meta;
import com.mpbhms.backend.dto.PermissionDTO;
import com.mpbhms.backend.dto.ResultPaginationDTO;
import com.mpbhms.backend.entity.PermissionEntity;
import com.mpbhms.backend.entity.RoleEntity;
import com.mpbhms.backend.exception.BusinessException;
import com.mpbhms.backend.exception.IdInvalidException;
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
import java.util.HashMap;
import java.util.List;
import java.util.Map;
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
    public PermissionEntity createPermission(PermissionEntity permission) {
        Map<String, String> errors = new HashMap<>();

        if (permissionRepository.existsByModuleAndApiPathAndMethod(
                permission.getModule(),
                permission.getApiPath(),
                permission.getMethod()
        )) {
            errors.put("permission", "Permission already exists for this module + path + method combination");
        }

        if (!errors.isEmpty()) {
            throw new BusinessException("Permission creation failed", errors);
        }

        return permissionRepository.save(permission);
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
        // Validate logic ở đầu hàm
        PermissionEntity existing = getById(permission.getId());
        if (existing == null) {
            throw new IdInvalidException("Permission with id " + permission.getId() + " does not exist");
        }

        PermissionEntity duplicate = permissionRepository.findByModuleAndApiPathAndMethod(
                permission.getModule(), permission.getApiPath(), permission.getMethod()
        );

        if (duplicate != null && !duplicate.getId().equals(permission.getId())) {
            throw new BusinessException("Permission already exists with the same module + path + method");
        }

        // Cập nhật
        existing.setName(permission.getName());
        existing.setApiPath(permission.getApiPath());
        existing.setMethod(permission.getMethod());
        existing.setModule(permission.getModule());

        return permissionRepository.save(existing);
    }
    @Override
    public void deletePermission(Long id) {
        PermissionEntity permission = permissionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Permission không tồn tại với ID: " + id));

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
