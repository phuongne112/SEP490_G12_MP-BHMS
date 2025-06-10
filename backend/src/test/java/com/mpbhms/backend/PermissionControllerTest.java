package com.mpbhms.backend;

import com.mpbhms.backend.controller.PermissionController;
import com.mpbhms.backend.dto.ResultPaginationDTO;
import com.mpbhms.backend.entity.PermissionEntity;
import com.mpbhms.backend.exception.IdInvalidException;
import com.mpbhms.backend.service.PermissionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class PermissionControllerTest {

    @Mock
    private PermissionService permissionService;

    @InjectMocks
    private PermissionController permissionController;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void create_WhenPermissionDoesNotExist_ShouldCreatePermission() throws IdInvalidException {
        // Arrange
        PermissionEntity permission = new PermissionEntity();
        permission.setModule("test-module");
        permission.setApiPath("/api/test");
        permission.setMethod("GET");

        when(permissionService.isPermission(any(PermissionEntity.class))).thenReturn(false);
        when(permissionService.addPermission(any(PermissionEntity.class))).thenReturn(permission);

        // Act
        ResponseEntity<PermissionEntity> response = permissionController.create(permission);

        // Assert
        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertEquals(permission, response.getBody());
        verify(permissionService).isPermission(permission);
        verify(permissionService).addPermission(permission);
    }

    @Test
    void create_WhenPermissionExists_ShouldThrowException() {
        // Arrange
        PermissionEntity permission = new PermissionEntity();
        when(permissionService.isPermission(any(PermissionEntity.class))).thenReturn(true);

        // Act & Assert
        assertThrows(IdInvalidException.class, () -> permissionController.create(permission));
        verify(permissionService).isPermission(permission);
        verify(permissionService, never()).addPermission(any());
    }

    @Test
    void update_WhenPermissionExistsAndValid_ShouldUpdatePermission() throws IdInvalidException {
        // Arrange
        PermissionEntity permission = new PermissionEntity();
        permission.setId(1L);

        when(permissionService.getById(permission.getId())).thenReturn(permission);
        when(permissionService.isPermission(permission)).thenReturn(false);
        when(permissionService.updatePermission(permission)).thenReturn(permission);

        // Act
        ResponseEntity<PermissionEntity> response = permissionController.update(permission);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(permission, response.getBody());
        verify(permissionService).getById(permission.getId());
        verify(permissionService).updatePermission(permission);
    }

    @Test
    void update_WhenPermissionDoesNotExist_ShouldThrowException() {
        // Arrange
        PermissionEntity permission = new PermissionEntity();
        permission.setId(1L);

        when(permissionService.getById(permission.getId())).thenReturn(null);

        // Act & Assert
        assertThrows(IdInvalidException.class, () -> permissionController.update(permission));
        verify(permissionService).getById(permission.getId());
        verify(permissionService, never()).updatePermission(any());
    }

    @Test
    void update_WhenPermissionExistsButDuplicate_ShouldThrowException() {
        // Arrange
        PermissionEntity permission = new PermissionEntity();
        permission.setId(1L);

        when(permissionService.getById(permission.getId())).thenReturn(permission);
        when(permissionService.isPermission(permission)).thenReturn(true);
        when(permissionService.isSameName(permission)).thenReturn(true);

        // Act & Assert
        assertThrows(IdInvalidException.class, () -> permissionController.update(permission));
        verify(permissionService).getById(permission.getId());
        verify(permissionService).isPermission(permission);
        verify(permissionService).isSameName(permission);
        verify(permissionService, never()).updatePermission(any());
    }

    @Test
    void delete_WhenPermissionExists_ShouldDeletePermission() throws IdInvalidException {
        // Arrange
        long id = 1L;
        when(permissionService.getById(id)).thenReturn(new PermissionEntity());
        doNothing().when(permissionService).deletePermission(id);

        // Act
        ResponseEntity<Void> response = permissionController.delete(id);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(permissionService).getById(id);
        verify(permissionService).deletePermission(id);
    }

    @Test
    void delete_WhenPermissionDoesNotExist_ShouldThrowException() {
        // Arrange
        long id = 1L;
        when(permissionService.getById(id)).thenReturn(null);

        // Act & Assert
        assertThrows(IdInvalidException.class, () -> permissionController.delete(id));
        verify(permissionService).getById(id);
        verify(permissionService, never()).deletePermission(anyLong());
    }

    @Test
    void getAllPermissions_ShouldReturnPaginatedResult() {
        // Arrange
        Specification<PermissionEntity> spec = mock(Specification.class);
        Pageable pageable = PageRequest.of(0, 10);
        ResultPaginationDTO expectedResult = new ResultPaginationDTO();

        when(permissionService.getAllPermissions(any(), any())).thenReturn(expectedResult);

        // Act
        ResponseEntity<ResultPaginationDTO> response = permissionController.getAllPermissions(spec, pageable);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(expectedResult, response.getBody());
        verify(permissionService).getAllPermissions(spec, pageable);
    }
}