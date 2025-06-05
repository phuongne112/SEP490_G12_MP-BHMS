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
    public ResponseEntity<PermissionEntity> create(@RequestBody PermissionEntity permission) throws IdInvalidException {
          //Check exist
         if (this.permissionService.isPermission(permission)){
             throw new IdInvalidException("Permission already exists");
         }
          //Create New
         return ResponseEntity.status(HttpStatus.CREATED).body(this.permissionService.addPermission(permission));
     }
     @PutMapping()
    public ResponseEntity<PermissionEntity> update(@RequestBody PermissionEntity permission) throws IdInvalidException {
         //Check exist with id
         if (this.permissionService.getById(permission.getId()) == null){
             throw new IdInvalidException("Permission with id " + permission.getId() + " does not exist");
         }
         //Check exist by module, apiPath and method
         if (this.permissionService.isPermission(permission)) {
             //Check name
             if (this.permissionService.isSameName(permission)) {
                 throw new IdInvalidException("Permission already exists");
             }
         }
         //Update permission
         return ResponseEntity.status(HttpStatus.OK).body(this.permissionService.updatePermission(permission));
     }
     @DeleteMapping("/{id}")
     public ResponseEntity<Void> delete(@PathVariable("id") long id) throws IdInvalidException {
         //Check exist with id
         if (this.permissionService.getById(id) == null){
             throw new IdInvalidException("Permission with id " + id + " does not exist");
         }
         this.permissionService.deletePermission(id);
         return ResponseEntity.ok().body(null);
     }
     @GetMapping()
     public ResponseEntity<ResultPaginationDTO> getAllPermissions(
             @Filter Specification<PermissionEntity> spec,
             Pageable pageable
     ) {
         return ResponseEntity.ok(permissionService.getAllPermissions(spec, pageable));
     }


}
