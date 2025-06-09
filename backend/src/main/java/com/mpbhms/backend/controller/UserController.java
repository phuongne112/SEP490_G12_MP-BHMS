package com.mpbhms.backend.controller;


import com.mpbhms.backend.dto.*;
import com.mpbhms.backend.entity.UserEntity;
import com.mpbhms.backend.entity.UserInfoEntity;
import com.mpbhms.backend.exception.IdInvalidException;
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
        boolean isEmailExist = this.userService.isEmailExist(userEntity.getEmail());
        if (isEmailExist) {
            throw new IdInvalidException("Email " + userEntity.getEmail() + " đã tồn tại, vui lòng sử dụng email khác");
        }

        UserEntity saved = userService.CreateUser(userEntity);
        return ResponseEntity.status(HttpStatus.CREATED).body(this.userService.convertToCreateUserDTO(saved));
    }


    @PutMapping()
    public ResponseEntity<UpdateUserDTO> updateUser(@RequestBody UserEntity user) throws IdInvalidException {
        boolean isEmailExist = this.userService.isEmailExist(user.getEmail());
        UserEntity user2 = this.userService.handleFetchUserById(user.getId());
        if (user2 == null || !isEmailExist) {
            throw new IdInvalidException("id hoặc email không tồn tại");
        } else {
            UserEntity user3 = this.userService.handleUpdateUser(user);
            return ResponseEntity.status(HttpStatus.OK).body(this.userService.convertResUpdateUserDTO(user3));

        }

    }
    @PutMapping("/{id}/status")
    public ResponseEntity<Void> updateUserStatus(
            @PathVariable Long id,
            @RequestBody UpdateUserStatusRequest request) {
        userService.updateUserStatus(id, request.isActive());
        return ResponseEntity.noContent().build();
    }
}
