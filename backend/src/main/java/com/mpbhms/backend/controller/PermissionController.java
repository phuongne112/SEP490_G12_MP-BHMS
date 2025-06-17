package com.mpbhms.backend.controller;

import com.mpbhms.backend.dto.PermissionRequestDTO;
import com.mpbhms.backend.dto.ResultPaginationDTO;
import com.mpbhms.backend.entity.Permission;
import com.mpbhms.backend.service.PermissionService;
import com.mpbhms.backend.util.ApiMessage;
import com.turkraft.springfilter.boot.Filter;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/mpbhms/permissions")
@RequiredArgsConstructor
public class PermissionController {
    private final PermissionService permissionService;

    @PostMapping
    @ApiMessage("Create a new permission")
    public ResponseEntity<Permission> create(@Valid @RequestBody PermissionRequestDTO request) {
        Permission created = permissionService.createPermission(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping
    @ApiMessage("Update an existing permission")
    public ResponseEntity<Permission> update(@Valid @RequestBody PermissionRequestDTO request) {
        Permission updated = permissionService.updatePermission(request);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    @ApiMessage("Delete a permission by ID")
    public ResponseEntity<Void> delete(@PathVariable("id") long id) {
        permissionService.deletePermission(id);
        return ResponseEntity.ok().build();
    }

    @GetMapping
    @ApiMessage("Get all permissions with filters and pagination")
    public ResponseEntity<ResultPaginationDTO> getAllPermissions(
            @Filter Specification<Permission> spec,
            Pageable pageable) {
        return ResponseEntity.ok(permissionService.getAllPermissions(spec, pageable));
    }
}

