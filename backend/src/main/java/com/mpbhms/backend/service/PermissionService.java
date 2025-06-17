package com.mpbhms.backend.service;

import com.mpbhms.backend.dto.PermissionRequestDTO;
import com.mpbhms.backend.dto.ResultPaginationDTO;
import com.mpbhms.backend.entity.Permission;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

public interface PermissionService {

    // Tạo mới Permission từ DTO
    Permission createPermission(PermissionRequestDTO request);

    // Cập nhật Permission từ DTO
    Permission updatePermission(PermissionRequestDTO request);

    // Lấy Permission theo ID
    Permission getById(Long id);

    // Xóa Permission theo ID
    void deletePermission(Long id);

    // Phân trang + lọc danh sách Permission
    ResultPaginationDTO getAllPermissions(Specification<Permission> spec, Pageable pageable);
}
