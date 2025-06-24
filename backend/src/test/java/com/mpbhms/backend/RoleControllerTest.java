package com.mpbhms.backend;

import com.mpbhms.backend.controller.RoleController;
import com.mpbhms.backend.dto.Meta;
import com.mpbhms.backend.dto.ResultPaginationDTO;
import com.mpbhms.backend.entity.Role;
import com.mpbhms.backend.exception.IdInvalidException;
import com.mpbhms.backend.service.RoleService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
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
        Role role = new Role();
        role.setRoleName("TEST_ROLE");
        role.setId(1L);

        when(roleService.createRole(any(Role.class))).thenReturn(role);

        // Act
        ResponseEntity<Role> response = roleController.createRole(role);

        // Assert
        assertNotNull(response);
        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        Role responseBody = response.getBody();
        assertNotNull(responseBody);
        assertEquals(role.getRoleName(), responseBody.getRoleName());
        assertEquals(role.getId(), responseBody.getId());

        // Verify
        verify(roleService).createRole(role);
    }

    @Test
    void createRole_NameExists() {
        // Arrange
        Role role = new Role();
        role.setRoleName("EXISTING_ROLE");

        // Giả lập createRole() sẽ ném lỗi nếu tên tồn tại
        when(roleService.createRole(any(Role.class)))
                .thenThrow(new IdInvalidException("Role name already exists"));

        // Act & Assert
        assertThrows(IdInvalidException.class, () -> roleController.createRole(role));

        // Verify gọi đúng service
        verify(roleService).createRole(role);
    }

    @Test
    void updateRole_Success() {
        // Arrange
        Role role = new Role();
        role.setId(1L);
        role.setRoleName("UPDATED_ROLE");

        when(roleService.updateRole(any(Role.class))).thenReturn(role);

        // Act
        ResponseEntity<Role> response = roleController.updateRole(role);

        // Assert
        assertNotNull(response);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        Role responseBody = response.getBody();
        assertNotNull(responseBody);
        assertEquals(role.getRoleName(), responseBody.getRoleName());
        assertEquals(role.getId(), responseBody.getId());

        // Verify
        verify(roleService).updateRole(role);
    }


    @Test
    void updateRole_NotFound() {
        // Arrange
        Role role = new Role();
        role.setId(999L);

        // Giả lập service ném lỗi nếu role không tồn tại
        when(roleService.updateRole(any(Role.class)))
                .thenThrow(new IdInvalidException("Role with id = 999 not found."));

        // Act & Assert
        assertThrows(IdInvalidException.class, () -> roleController.updateRole(role));

        // Verify
        verify(roleService).updateRole(role);
    }


    @Test
    void deleteRole_Success() {
        // Arrange
        Long roleId = 1L;
        doNothing().when(roleService).deleteRole(roleId);

        // Act
        ResponseEntity<Void> response = roleController.deleteRole(roleId);

        // Assert
        assertNotNull(response);
        assertEquals(HttpStatus.OK, response.getStatusCode());

        // Verify
        verify(roleService).deleteRole(roleId);
    }

    @Test
    void deleteRole_NotFound() {
        // Arrange
        Long roleId = 999L;

        // Giả lập deleteRole ném ra IdInvalidException
        doThrow(new IdInvalidException("Role with id 999 does not exist"))
                .when(roleService).deleteRole(roleId);

        // Act & Assert
        assertThrows(IdInvalidException.class, () -> roleController.deleteRole(roleId));

        // Verify đã gọi method
        verify(roleService).deleteRole(roleId);
    }



    @Test
    void getAllRoles_Success() {
        // Arrange
        Role role1 = new Role();
        role1.setId(1L);
        role1.setRoleName("ROLE_1");

        Role role2 = new Role();
        role2.setId(2L);
        role2.setRoleName("ROLE_2");

        List<Role> roles = Arrays.asList(role1, role2);
        Pageable pageable = PageRequest.of(0, 10);

        Meta meta = new Meta();
        meta.setPage(1);
        meta.setPageSize(10);
        meta.setPages(1);
        meta.setTotal(2);

        ResultPaginationDTO expectedResult = new ResultPaginationDTO();
        expectedResult.setMeta(meta);
        expectedResult.setResult(roles);

        when(roleService.getAllRoles(any(), eq(pageable))).thenReturn(expectedResult);

        // Act
        ResponseEntity<ResultPaginationDTO> response = roleController.getAllRoles(null, pageable);

        // Assert
        assertNotNull(response);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        ResultPaginationDTO responseBody = response.getBody();
        assertNotNull(responseBody);
        assertTrue(responseBody.getResult() instanceof List);
        List<?> resultList = (List<?>) responseBody.getResult();
        assertEquals(2, resultList.size());
        assertEquals(2, responseBody.getMeta().getTotal());

        // Verify
        verify(roleService).getAllRoles(any(), eq(pageable));
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

        when(roleService.getAllRoles(any(), eq(pageable))).thenReturn(expectedResult);

        // Act
        ResponseEntity<ResultPaginationDTO> response = roleController.getAllRoles(null, pageable);

        // Assert
        assertNotNull(response);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        ResultPaginationDTO responseBody = response.getBody();
        assertNotNull(responseBody);
        assertTrue(responseBody.getResult() instanceof List);
        List<?> resultList = (List<?>) responseBody.getResult();
        assertTrue(resultList.isEmpty());
        assertEquals(0, responseBody.getMeta().getTotal());

        // Verify
        verify(roleService).getAllRoles(any(), eq(pageable));
    }
}