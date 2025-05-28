package com.mpbhms.backend.service;

import com.mpbhms.backend.dto.CreateUserDTO;
import com.mpbhms.backend.dto.UserWithRoleDTO;
import com.mpbhms.backend.entity.UserEntity;

import java.util.List;

public interface UserService {
    List<UserWithRoleDTO> getAllUsersWithRoles();
    UserEntity createUserWithRenterRole(CreateUserDTO request);
    UserEntity getUserWithEmail(String email);
}
