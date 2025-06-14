package com.mpbhms.backend.controller;

import com.mpbhms.backend.dto.ResultPaginationDTO;
import com.mpbhms.backend.entity.PermissionEntity;
import com.mpbhms.backend.exception.IdInvalidException;
import com.mpbhms.backend.service.PermissionService;
import com.turkraft.springfilter.boot.Filter;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/mpbhms/permissions")
@RequiredArgsConstructor
public class PermissionController {
    private final PermissionService permissionService;
    @PostMapping
    public ResponseEntity<PermissionEntity> create(@RequestBody PermissionEntity permission) {
        PermissionEntity created = permissionService.createPermission(permission);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping
    public ResponseEntity<PermissionEntity> update(@RequestBody PermissionEntity permission) {
        return ResponseEntity.ok(permissionService.updatePermission(permission));
    }
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable("id") long id) {
        permissionService.deletePermission(id);
        return ResponseEntity.ok().build(); // build() gọn hơn body(null)
    }

    @GetMapping()
     public ResponseEntity<ResultPaginationDTO> getAllPermissions(
             @Filter Specification<PermissionEntity> spec,
             Pageable pageable
     ) {
         return ResponseEntity.ok(permissionService.getAllPermissions(spec, pageable));
     }


}
