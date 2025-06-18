package com.mpbhms.backend.service;

import com.mpbhms.backend.dto.*;
import com.mpbhms.backend.entity.User;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

public interface UserService {

    User getUserWithEmail(String email);
    CreateUserResponse convertToCreateUserDTO(User entity);
    void updateUserToken(String token, String email);
    User getUserByRefreshTokenAndEmail(String refreshToken, String email);
    ResultPaginationDTO getAllUsers(Specification<User> spec, Pageable pageable);
    User createUser(CreateUserRequest userDTO);
    User signUp(CreateUserRequest userDTO);
    boolean isEmailExist(String email);
    User handleFetchUserById(long id);
    User handleUpdateUser(UpdateUserDTO dto);
    UpdateUserDTO convertResUpdateUserDTO(User user);
    void changePasswordUser(String email, String currentPassword, String newPassword);
    void sendResetPasswordToken(String email);
    void resetPassword(String token, String newPassword);
    User handleGetUserByUsername(String username);
    void updateUserStatus(Long userId, boolean isActive);
    boolean isUsernameExist(String username);
    UserAccountDtoResponse getUserAccountById(Long id);
    UserInfoDtoResponse getUserInfoById(Long userId);
    void updateUserInfo(Long userId, UserInfoDtoRequest request);
    void updateUserAccount(Long userId, UserAccountDtoRequest request);
    void addUserInfo(Long userId, UserInfoDtoRequest request);
}
