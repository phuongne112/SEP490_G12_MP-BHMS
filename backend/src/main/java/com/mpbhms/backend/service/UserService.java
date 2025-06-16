package com.mpbhms.backend.service;

import com.mpbhms.backend.dto.*;
import com.mpbhms.backend.entity.UserEntity;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

public interface UserService {

    UserEntity getUserWithEmail(String email);
    CreateUserResponse convertToCreateUserDTO(UserEntity entity);
    void updateUserToken(String token, String email);
    UserEntity getUserByRefreshTokenAndEmail(String refreshToken, String email);
    ResultPaginationDTO getAllUsers(Specification<UserEntity> spec, Pageable pageable);
    UserEntity createUser(CreateUserRequest userDTO);
    UserEntity signUp(CreateUserRequest userDTO);
    boolean isEmailExist(String email);
    UserEntity handleFetchUserById(long id);
    UserEntity handleUpdateUser(UserEntity user);
    UpdateUserDTO convertResUpdateUserDTO(UserEntity user);
    String changePasswordUser(String username, String currentPassword, String newPassword);
    void sendResetPasswordToken(String email);
    void resetPassword(String token, String newPassword);
    UserEntity handleGetUserByUsername(String username);
    void updateUserStatus(Long userId, boolean isActive);
    boolean isUsernameExist(String username);
    UserAccountDtoResponse getUserAccountById(Long id);
    UserInfoDtoResponse getUserInfoById(Long userId);
    void updateUserInfo(Long userId, UserInfoDtoRequest request);
    void updateUserAccount(Long userId, UserAccountDtoRequest request);
}
