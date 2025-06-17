package com.mpbhms.backend.controller;

import com.mpbhms.backend.dto.*;
import com.mpbhms.backend.entity.User;
import com.mpbhms.backend.exception.BusinessException;
import com.mpbhms.backend.exception.IdInvalidException;
import com.mpbhms.backend.service.UserService;
import com.mpbhms.backend.util.ApiMessage;
import com.mpbhms.backend.util.SecurityUtil;
import com.turkraft.springfilter.boot.Filter;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/mpbhms/users")
@RequiredArgsConstructor
public class UserController {
    private final UserService userService;
    private final PasswordEncoder passwordEncoder;
   private final SecurityUtil securityUtil;
    @GetMapping
    @ApiMessage("Get all users with filters and pagination")
    public ResponseEntity<ResultPaginationDTO> getAllUsers(
            @Filter Specification<User> spec,
            Pageable pageable
    ) {
        ResultPaginationDTO result = userService.getAllUsers(spec, pageable);
        return ResponseEntity.ok(result);
    }

    @PostMapping
    @ApiMessage("Create a new user account")
    public ResponseEntity<CreateUserResponse> createNewUser(@Valid @RequestBody CreateUserRequest request) {
        User savedUser = userService.createUser(request); // đã bao gồm logic kiểm tra
        return ResponseEntity.status(HttpStatus.CREATED).body(userService.convertToCreateUserDTO(savedUser));
    }


    @PutMapping
    @ApiMessage("Update an existing user account")
    public ResponseEntity<UpdateUserDTO> updateUser(@Valid @RequestBody UpdateUserDTO dto) {
        User updatedUser = userService.handleUpdateUser(dto);
        return ResponseEntity.ok(userService.convertResUpdateUserDTO(updatedUser));
    }


    @PutMapping("/{id}/status")
    @ApiMessage("Update user account status (activate/deactivate)")
    public ResponseEntity<Void> updateUserStatus(
            @PathVariable Long id,
            @Valid @RequestBody UpdateUserStatusRequest request) {
        User existingUser = userService.handleFetchUserById(id);
        if (existingUser == null) {
            throw new BusinessException("User with ID '" + id + "' not found");
        }

        userService.updateUserStatus(id, request.isActive());
        return ResponseEntity.noContent().build();
    }
    @GetMapping("/me/info")
    @ApiMessage("Get user info")
    public ResponseEntity<UserInfoDtoResponse> getUserInfoById() {
        Long currentUserId = SecurityUtil.getCurrentUserId();
        if (currentUserId == null) {
            throw new IdInvalidException("You do not have permission to access this endpoint!!!");
        }
        return ResponseEntity.ok(userService.getUserInfoById(currentUserId));
    }
    @GetMapping("/me/account")
    public ResponseEntity<UserAccountDtoResponse> getMyAccount() {
        Long currentUserId = SecurityUtil.getCurrentUserId();
        if (currentUserId == null) {
            throw new IdInvalidException("You do not have permission to access this endpoint!!!");
        }
        return ResponseEntity.ok(userService.getUserAccountById(currentUserId));
    }
    @PutMapping("/me/info")
    @ApiMessage("Update user info")
    public ResponseEntity<Void> updateUserInfoByMe(@RequestBody @Valid UserInfoDtoRequest request) {
        Long currentUserId = SecurityUtil.getCurrentUserId();
        if (currentUserId == null) {
            throw new IdInvalidException("You do not have permission to access this endpoint!!!");
        }

        userService.updateUserInfo(currentUserId, request);
        return ResponseEntity.noContent().build();
    }
    @PutMapping("/me/account")
    @ApiMessage("Update user account")
    public ResponseEntity<Void> updateUserAccountByMe(@RequestBody @Valid UserAccountDtoRequest request) {
        Long currentUserId = SecurityUtil.getCurrentUserId();
        if (currentUserId == null) {
            throw new IdInvalidException("You do not have permission to access this endpoint!!!");
        }

        userService.updateUserAccount(currentUserId, request);
        return ResponseEntity.noContent().build();
    }


}