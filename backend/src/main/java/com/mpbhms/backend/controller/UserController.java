package com.mpbhms.backend.controller;


import com.mpbhms.backend.dto.*;
import com.mpbhms.backend.entity.UserEntity;
import com.mpbhms.backend.entity.UserInfoEntity;
import com.mpbhms.backend.exception.IdInvalidException;
import com.mpbhms.backend.response.CreateUserDTOResponse;
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

import java.util.List;

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
    public ResponseEntity<CreateUserDTO> createNewUser(
            @Valid @RequestBody UserEntity userEntity
    ) {
        boolean isEmailExist = this.userService.isEmailExist(userEntity.getEmail());
        if (isEmailExist) {
            throw new IdInvalidException("Email " + userEntity.getEmail() + " đã tồn tại, vui lòng sử dụng email khác");
        }

        // ✅ Hash mật khẩu
        String hashedPassword = passwordEncoder.encode(userEntity.getPassword());
        userEntity.setPassword(hashedPassword);

        UserEntity user = this.userService.CreateUser(userEntity);
        return ResponseEntity.status(HttpStatus.CREATED).body(this.userService.convertToCreateUserDTO(user));
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
}
