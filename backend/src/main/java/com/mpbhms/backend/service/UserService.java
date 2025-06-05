package com.mpbhms.backend.service;

import com.mpbhms.backend.dto.*;
import com.mpbhms.backend.entity.UserEntity;
import com.mpbhms.backend.response.CreateUserDTOResponse;
import com.mpbhms.backend.response.convertResUpdateUserDTO;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

import java.util.List;

public interface UserService {

    UserEntity getUserWithEmail(String email);
    CreateUserDTO convertToCreateUserDTO(UserEntity entity);
    void updateUserToken(String token, String email);
    UserEntity getUserByRefreshTokenAndEmail(String refreshToken, String email);
    ResultPaginationDTO getAllUsers(Specification<UserEntity> spec, Pageable pageable);
    UserEntity CreateUser(UserEntity userDTO);
    boolean isEmailExist(String email);
    UserEntity handleFetchUserById(long id);
    UserEntity handleUpdateUser(UserEntity user);
    UpdateUserDTO convertResUpdateUserDTO(UserEntity user);
}
