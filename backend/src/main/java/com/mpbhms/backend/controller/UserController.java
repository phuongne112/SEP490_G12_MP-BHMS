package com.mpbhms.backend.controller;


import com.mpbhms.backend.dto.CreateUserDTO;
import com.mpbhms.backend.dto.UserWithRoleDTO;
import com.mpbhms.backend.entity.UserEntity;
import com.mpbhms.backend.response.CreateUserDTOResponse;
import com.mpbhms.backend.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
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

    @GetMapping("/roles")
    public ResponseEntity<List<UserWithRoleDTO>> getUsersWithRoles() {
        List<UserWithRoleDTO> users = userService.getAllUsersWithRoles();
        return ResponseEntity.ok(users);
    }
    @PostMapping()
    public ResponseEntity<CreateUserDTOResponse> createRenterUser(@Valid @RequestBody CreateUserDTO request) {
        String hashedPassword = passwordEncoder.encode(request.getPassword());
        request.setPassword(hashedPassword);
        UserEntity user = userService.createUserWithRenterRole(request);
        return new ResponseEntity<>(this.userService.convertToCreateUserDTO(user), HttpStatus.CREATED);
    }
}
