package com.mpbhms.backend.service.impl;

import com.mpbhms.backend.dto.Meta;
import com.mpbhms.backend.dto.PermissionDTO;
import com.mpbhms.backend.dto.PermissionRequestDTO;
import com.mpbhms.backend.dto.ResultPaginationDTO;
import com.mpbhms.backend.entity.Permission;
import com.mpbhms.backend.entity.Role;
import com.mpbhms.backend.exception.BusinessException;
import com.mpbhms.backend.exception.IdInvalidException;
import com.mpbhms.backend.exception.ResourceNotFoundException;
import com.mpbhms.backend.repository.PermissionRepository;
import com.mpbhms.backend.service.PermissionService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class PermissionServiceImpl implements PermissionService {

    private final PermissionRepository permissionRepository;


    public boolean isPermission(Permission permission) {
        return this.permissionRepository.existsByModuleAndApiPathAndMethod(
                permission.getModule(),
                permission.getApiPath(),
                permission.getMethod());
    }

    @Override
    public Permission createPermission(PermissionRequestDTO request) {
        Map<String, String> errors = new HashMap<>();

        boolean exists = permissionRepository.existsByModuleAndApiPathAndMethod(
                request.getModule(), request.getApiPath(), request.getMethod());

        if (exists) {
            errors.put("permission", "Permission already exists for this module + path + method combination");
            throw new BusinessException("Permission creation failed", errors);
        }

        Permission permission = new Permission();
        permission.setName(request.getName());
        permission.setApiPath(request.getApiPath());
        permission.setMethod(request.getMethod());
        permission.setModule(request.getModule());

        return permissionRepository.save(permission);
    }

    @Override
    public Permission getById(Long Id) {
        Optional<Permission> permission = this.permissionRepository.findById(Id);
        if (permission.isPresent()) {
            return permission.get();
        }
        return null;
    }

    @Override
    public Permission updatePermission(PermissionRequestDTO request) {
        Permission existing = permissionRepository.findById(request.getId())
                .orElseThrow(() -> new IdInvalidException("Permission with id " + request.getId() + " does not exist"));

        Permission duplicate = permissionRepository.findByModuleAndApiPathAndMethod(
                request.getModule(), request.getApiPath(), request.getMethod());

        if (duplicate != null && !duplicate.getId().equals(request.getId())) {
            throw new BusinessException("Permission already exists with the same module + path + method");
        }

        // Cập nhật
        existing.setName(request.getName());
        existing.setApiPath(request.getApiPath());
        existing.setMethod(request.getMethod());
        existing.setModule(request.getModule());

        return permissionRepository.save(existing);
    }

    @Override
    public void deletePermission(Long id) {
        Permission permission = permissionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Permission không tồn tại với ID: " + id));

        // Xóa quan hệ giữa permission và role
        for (Role role : permission.getRoleEntities()) {
            role.getPermissionEntities().remove(permission);
        }

        // Xóa permission
        permissionRepository.delete(permission);
    }

    @Override
    public ResultPaginationDTO getAllPermissions(Specification<Permission> spec, Pageable pageable) {
        Page<Permission> page = permissionRepository.findAll(spec, pageable);
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

    private PermissionDTO convertToDTO(Permission entity) {
        PermissionDTO dto = new PermissionDTO();
        dto.setId(entity.getId()); // hoặc entity.getPermissionId() nếu tên khác
        dto.setName(entity.getName());
        dto.setApiPath(entity.getApiPath());
        dto.setMethod(entity.getMethod());
        dto.setModule(entity.getModule());
        return dto;
    }

    public boolean isSameName(Permission permission) {
        return this.permissionRepository.existsByName(permission.getName());
    }
}
