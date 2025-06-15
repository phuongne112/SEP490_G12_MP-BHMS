package com.mpbhms.backend.controller;

import com.mpbhms.backend.dto.ResultPaginationDTO;
import com.mpbhms.backend.entity.RoleEntity;
import com.mpbhms.backend.exception.IdInvalidException;
import com.mpbhms.backend.service.RoleService;
import com.mpbhms.backend.util.ApiMessage;
import com.turkraft.springfilter.boot.Filter;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/mpbhms/roles")
@RequiredArgsConstructor
public class RoleController {
    private final RoleService roleService;
    @PostMapping
    @ApiMessage("Create a new role")
    public ResponseEntity<RoleEntity> createRole(@Valid @RequestBody RoleEntity roleEntity) {
        RoleEntity savedRole = roleService.createRole(roleEntity);
        return ResponseEntity.status(HttpStatus.CREATED).body(savedRole);
    }
    @PutMapping
    @ApiMessage("Update an existing role")
    public ResponseEntity<RoleEntity> updateRole(@Valid @RequestBody RoleEntity roleEntity) {
        RoleEntity updatedRole = roleService.updateRole(roleEntity);
        return ResponseEntity.ok(updatedRole);
    }

    @DeleteMapping("/{id}")
    @ApiMessage("Delete a role by ID")
    public ResponseEntity<Void> deleteRole(@PathVariable("id") long id) {
        roleService.deleteRole(id);
        return ResponseEntity.ok().build(); // dùng build() gọn hơn body(null)
    }
    @GetMapping
    @ApiMessage("Get all roles with filters and pagination")
    public ResponseEntity<ResultPaginationDTO> getAllRoles(
            @Filter Specification<RoleEntity> spec,
            Pageable pageable
    ) {
        return ResponseEntity.ok(roleService.getAllRoles(spec, pageable));
    }

}
