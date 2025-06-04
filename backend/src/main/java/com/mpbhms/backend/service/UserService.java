package com.mpbhms.backend.service;

import com.mpbhms.backend.dto.*;
import com.mpbhms.backend.entity.UserEntity;
import com.mpbhms.backend.response.CreateUserDTOResponse;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

import java.util.List;

public interface UserService {
    List<UserWithRoleDTO> getAllUsersWithRoles();
    UserEntity createUserWithRenterRole(CreateUserDTO request);
    UserEntity getUserWithEmail(String email);
    CreateUserDTOResponse convertToCreateUserDTO(UserEntity entity);
    void updateUserToken(String token, String email);
    UserEntity getUserByRefreshTokenAndEmail(String refreshToken, String email);
    ResultPaginationDTO getAllUsers(Specification<UserEntity> spec, Pageable pageable);
    UserDTO updateUserById(Long id, UpdateUserDTO request);
}
