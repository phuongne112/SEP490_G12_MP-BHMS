package com.mpbhms.backend.controller;

import com.mpbhms.backend.dto.*;
import com.mpbhms.backend.entity.UserEntity;
import com.mpbhms.backend.entity.UserInfoEntity;
import com.mpbhms.backend.exception.BusinessException;
import com.mpbhms.backend.service.UserService;
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

    @GetMapping
    public ResponseEntity<ResultPaginationDTO> getAllUsers(
            @Filter Specification<UserEntity> spec,
            Pageable pageable
    ) {
        ResultPaginationDTO result = userService.getAllUsers(spec, pageable);
        return ResponseEntity.ok(result);
    }

    @PostMapping()
    public ResponseEntity<CreateUserResponse> createNewUser(
            @Valid @RequestBody CreateUserRequest userEntity
    ) {
        if (userService.isEmailExist(userEntity.getEmail())) {
            throw new BusinessException("Email '" + userEntity.getEmail() + "' already exists, please use another email");
        }

        if (userService.isUsernameExist(userEntity.getUsername())) {
            throw new BusinessException("Username '" + userEntity.getUsername() + "' already exists, please choose another username");
        }

        UserEntity saved = userService.CreateUser(userEntity);
        return ResponseEntity.status(HttpStatus.CREATED).body(userService.convertToCreateUserDTO(saved));
    }

    @PutMapping()
    public ResponseEntity<UpdateUserDTO> updateUser(@Valid @RequestBody UserEntity user) {
        UserEntity existingUser = userService.handleFetchUserById(user.getId());
        if (existingUser == null) {
            throw new BusinessException("User with ID '" + user.getId() + "' not found");
        }

        // Check if new email is already used
        if (!existingUser.getEmail().equals(user.getEmail()) && userService.isEmailExist(user.getEmail())) {
            throw new BusinessException("Email '" + user.getEmail() + "' already exists, please use another email");
        }

        // Check if new username is already used
        if (!existingUser.getUsername().equals(user.getUsername()) && userService.isUsernameExist(user.getUsername())) {
            throw new BusinessException("Username '" + user.getUsername() + "' already exists, please choose another username");
        }

        UserEntity updatedUser = userService.handleUpdateUser(user);
        return ResponseEntity.ok(userService.convertResUpdateUserDTO(updatedUser));
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<Void> updateUserStatus(
            @PathVariable Long id,
            @Valid @RequestBody UpdateUserStatusRequest request) {
        UserEntity existingUser = userService.handleFetchUserById(id);
        if (existingUser == null) {
            throw new BusinessException("User with ID '" + id + "' not found");
        }

        userService.updateUserStatus(id, request.isActive());
        return ResponseEntity.noContent().build();
    }
}