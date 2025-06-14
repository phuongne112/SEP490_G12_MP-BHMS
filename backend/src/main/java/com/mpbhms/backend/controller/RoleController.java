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
        if (this.roleService.getById(roleEntity.getId()) == null){
            throw new IdInvalidException("Role with id " + roleEntity.getId() + " does not exist");
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(this.roleService.updateRole(roleEntity));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteRole(@PathVariable("id") long id) throws IdInvalidException {
        //Check exist with id
        if (this.roleService.getById(id) == null){
            throw new IdInvalidException("Role with id " + id + " does not exist");
        }
        this.roleService.deleteRole(id);
        return ResponseEntity.ok().body(null);
    }
    @GetMapping
    public ResponseEntity<ResultPaginationDTO> getAllRoles(
            @Filter Specification<RoleEntity> spec,
            Pageable pageable
    ) {
        return ResponseEntity.ok(roleService.getAllRoles(spec, pageable));
    }

}
