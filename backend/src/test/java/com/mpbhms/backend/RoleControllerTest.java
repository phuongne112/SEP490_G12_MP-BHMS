package com.mpbhms.backend;

import com.mpbhms.backend.controller.RoleController;
import com.mpbhms.backend.dto.Meta;
import com.mpbhms.backend.dto.ResultPaginationDTO;
import com.mpbhms.backend.entity.RoleEntity;
import com.mpbhms.backend.exception.IdInvalidException;
import com.mpbhms.backend.service.RoleService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.Arrays;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class RoleControllerTest {

    @Mock
    private RoleService roleService;

    @InjectMocks
    private RoleController roleController;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void createRole_Success() {
        // Arrange
        RoleEntity roleEntity = new RoleEntity();
        roleEntity.setRoleName("TEST_ROLE");
        roleEntity.setId(1L);

        when(roleService.existByName(roleEntity.getRoleName())).thenReturn(false);
        when(roleService.createRole(any(RoleEntity.class))).thenReturn(roleEntity);

        // Act
        ResponseEntity<RoleEntity> response = roleController.createRole(roleEntity);

        // Assert
        assertNotNull(response);
        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(roleEntity.getRoleName(), response.getBody().getRoleName());
        assertEquals(roleEntity.getId(), response.getBody().getId());

        // Verify
        verify(roleService).existByName(roleEntity.getRoleName());
        verify(roleService).createRole(roleEntity);
    }

    @Test
    void createRole_NameExists() {
        // Arrange
        RoleEntity roleEntity = new RoleEntity();
        roleEntity.setRoleName("EXISTING_ROLE");

        when(roleService.existByName(roleEntity.getRoleName())).thenReturn(true);

        // Act & Assert
        assertThrows(IdInvalidException.class, () -> roleController.createRole(roleEntity));

        // Verify
        verify(roleService).existByName(roleEntity.getRoleName());
        verify(roleService, never()).createRole(any(RoleEntity.class));
    }

    @Test
    void updateRole_Success() {
        // Arrange
        RoleEntity roleEntity = new RoleEntity();
        roleEntity.setId(1L);
        roleEntity.setRoleName("UPDATED_ROLE");

        when(roleService.getById(roleEntity.getId())).thenReturn(roleEntity);
        when(roleService.updateRole(any(RoleEntity.class))).thenReturn(roleEntity);

        // Act
        ResponseEntity<RoleEntity> response = roleController.updateRole(roleEntity);

        // Assert
        assertNotNull(response);
        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(roleEntity.getRoleName(), response.getBody().getRoleName());
        assertEquals(roleEntity.getId(), response.getBody().getId());

        // Verify
        verify(roleService).getById(roleEntity.getId());
        verify(roleService).updateRole(roleEntity);
    }

    @Test
    void updateRole_NotFound() {
        // Arrange
        RoleEntity roleEntity = new RoleEntity();
        roleEntity.setId(999L);

        when(roleService.getById(roleEntity.getId())).thenReturn(null);

        // Act & Assert
        assertThrows(IdInvalidException.class, () -> roleController.updateRole(roleEntity));

        // Verify
        verify(roleService).getById(roleEntity.getId());
        verify(roleService, never()).updateRole(any(RoleEntity.class));
    }

    @Test
    void deleteRole_Success() {
        // Arrange
        Long roleId = 1L;
        when(roleService.existsById(roleId)).thenReturn(true);
        doNothing().when(roleService).deleteRole(roleId);

        // Act
        ResponseEntity<Void> response = roleController.deleteRole(roleId);

        // Assert
        assertNotNull(response);
        assertEquals(HttpStatus.NO_CONTENT, response.getStatusCode());

        // Verify
        verify(roleService).existsById(roleId);
        verify(roleService).deleteRole(roleId);
    }

    @Test
    void deleteRole_NotFound() {
        // Arrange
        Long roleId = 999L;
        when(roleService.existsById(roleId)).thenReturn(false);

        // Act & Assert
        assertThrows(IdInvalidException.class, () -> roleController.deleteRole(roleId));

        // Verify
        verify(roleService).existsById(roleId);
        verify(roleService, never()).deleteRole(anyLong());
    }

    @Test
    void getAllRoles_Success() {
        // Arrange
        RoleEntity role1 = new RoleEntity();
        role1.setId(1L);
        role1.setRoleName("ROLE_1");

        RoleEntity role2 = new RoleEntity();
        role2.setId(2L);
        role2.setRoleName("ROLE_2");

        List<RoleEntity> roles = Arrays.asList(role1, role2);
        Pageable pageable = PageRequest.of(0, 10);

        Meta meta = new Meta();
        meta.setPage(1);
        meta.setPageSize(10);
        meta.setPages(1);
        meta.setTotal(2);

        ResultPaginationDTO expectedResult = new ResultPaginationDTO();
        expectedResult.setMeta(meta);
        expectedResult.setResult(roles);

        when(roleService.getAllRoles(any(Specification.class), eq(pageable))).thenReturn(expectedResult);

        // Act
        ResponseEntity<ResultPaginationDTO> response = roleController.getAllRoles(null, pageable);

        // Assert
        assertNotNull(response);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(2, ((List<RoleEntity>) response.getBody().getResult()).size());
        assertEquals(2, response.getBody().getMeta().getTotal());

        // Verify
        verify(roleService).getAllRoles(any(Specification.class), eq(pageable));
    }

    @Test
    void getAllRoles_Empty() {
        // Arrange
        Pageable pageable = PageRequest.of(0, 10);

        Meta meta = new Meta();
        meta.setPage(1);
        meta.setPageSize(10);
        meta.setPages(0);
        meta.setTotal(0);

        ResultPaginationDTO expectedResult = new ResultPaginationDTO();
        expectedResult.setMeta(meta);
        expectedResult.setResult(List.of());

        when(roleService.getAllRoles(any(Specification.class), eq(pageable))).thenReturn(expectedResult);

        // Act
        ResponseEntity<ResultPaginationDTO> response = roleController.getAllRoles(null, pageable);

        // Assert
        assertNotNull(response);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertTrue(((List<RoleEntity>) response.getBody().getResult()).isEmpty());
        assertEquals(0, response.getBody().getMeta().getTotal());

        // Verify
        verify(roleService).getAllRoles(any(Specification.class), eq(pageable));
    }
}