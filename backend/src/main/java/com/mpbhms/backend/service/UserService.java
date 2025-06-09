package com.mpbhms.backend.service;

import com.mpbhms.backend.dto.*;
import com.mpbhms.backend.entity.UserEntity;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

public interface UserService {

    UserEntity getUserWithEmail(String email);
    CreateUserRequest convertToCreateUserDTO(UserEntity entity);
    void updateUserToken(String token, String email);
    UserEntity getUserByRefreshTokenAndEmail(String refreshToken, String email);
    ResultPaginationDTO getAllUsers(Specification<UserEntity> spec, Pageable pageable);
    UserEntity CreateUser(UserEntity userDTO);
    UserEntity Register(UserEntity userDTO);
    boolean isEmailExist(String email);
    UserEntity handleFetchUserById(long id);
    UserEntity handleUpdateUser(UserEntity user);
    UpdateUserDTO convertResUpdateUserDTO(UserEntity user);
    String signUpUser(SignUpDTO request);
    String changePasswordUser(String username, String currentPassword, String newPassword);
    void sendResetPasswordToken(String email);
    void resetPassword(String token, String newPassword);
}
