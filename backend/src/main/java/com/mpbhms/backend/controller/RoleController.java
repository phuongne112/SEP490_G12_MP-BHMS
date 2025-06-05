package com.mpbhms.backend.controller;

import com.mpbhms.backend.dto.ResultPaginationDTO;
import com.mpbhms.backend.entity.RoleEntity;
import com.mpbhms.backend.exception.IdInvalidException;
import com.mpbhms.backend.service.RoleService;
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
    @PostMapping()
    public ResponseEntity<RoleEntity> createRole(@Valid @RequestBody RoleEntity roleEntity) throws IdInvalidException {
        // Check name exist
        if (roleService.existByName(roleEntity.getRoleName())) {
            throw new IdInvalidException("Role with name = \"" + roleEntity.getRoleName() + "\"not exist.");
        }

        RoleEntity savedRole = roleService.createRole(roleEntity);
        return ResponseEntity.status(HttpStatus.CREATED).body(savedRole);
    }
    @PutMapping()
    public ResponseEntity<RoleEntity> updateRole(@Valid @RequestBody RoleEntity roleEntity) throws IdInvalidException {
        // Check id exist
        if (this.roleService.getById(roleEntity.getRoleId()) == null){
            throw new IdInvalidException("Role with id " + roleEntity.getRoleId() + " does not exist");
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(this.roleService.updateRole(roleEntity));
    }
    @DeleteMapping("/id")
    public ResponseEntity<Void> deleteRole(@PathVariable("id") Long id) {
        // Kiểm tra tồn tại trước khi xóa
        if (!roleService.existsById(id)) {
            throw new IdInvalidException("Role với id = " + id + " không tồn tại.");
        }
        roleService.deleteRole(id);
        return ResponseEntity.noContent().build(); // ✅ Trả về 204 No Content
    }
    @GetMapping
    public ResponseEntity<ResultPaginationDTO> getAllRoles(
            @Filter Specification<RoleEntity> spec,
            Pageable pageable
    ) {
        return ResponseEntity.ok(roleService.getAllRoles(spec, pageable));
    }

}
