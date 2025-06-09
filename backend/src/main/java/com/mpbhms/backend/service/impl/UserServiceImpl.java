package com.mpbhms.backend.service.impl;

import com.mpbhms.backend.dto.*;
import com.mpbhms.backend.entity.*;
import com.mpbhms.backend.exception.IdInvalidException;
import com.mpbhms.backend.repository.UserRepository;
import com.mpbhms.backend.service.RoleService;
import com.mpbhms.backend.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {
    private final UserRepository userRepository;
    private final RoleService roleService;
    private final PasswordEncoder passwordEncoder;


    @Override
    public UserEntity getUserWithEmail(String email) {
    return this.userRepository.findByEmail(email);
    }

    public UserEntity handleGetUserByUsername(String username) {
        return this.userRepository.findByEmail(username);
    }
    @Override
    public CreateUserResponse convertToCreateUserDTO(UserEntity entity) {
        CreateUserResponse dto = new CreateUserResponse();
        dto.setUsername(entity.getUsername());
        dto.setEmail(entity.getEmail());
        dto.setIsActive(entity.getIsActive());
        dto.setCreatedDate(entity.getCreatedDate());
        return dto;
    }

    @Override
    public void updateUserToken(String token, String email) {
        UserEntity currentUser = this.getUserWithEmail(email);
        if (currentUser != null) {
            currentUser.setRefreshToken(token);
            userRepository.save(currentUser); // lưu lại thay đổi
        }
    }

    @Override
    public UserEntity getUserByRefreshTokenAndEmail(String refreshToken, String email) {
        return this.userRepository.findByRefreshTokenAndEmail(refreshToken, email);
    }
    @Override
    public ResultPaginationDTO getAllUsers(Specification<UserEntity> spec, Pageable pageable) {
        Page<UserEntity> userPage = userRepository.findAll(spec, pageable);
        List<UserDTO> userDTOs = userPage.getContent().stream()
                .map(this::convertToUserDTO)
                .toList();

        Meta meta = new Meta();
        meta.setPage(userPage.getNumber() + 1);
        meta.setPageSize(userPage.getSize());
        meta.setPages(userPage.getTotalPages());
        meta.setTotal(userPage.getTotalElements());

        ResultPaginationDTO result = new ResultPaginationDTO();
        result.setMeta(meta);
        result.setResult(userDTOs);
        return result;
    }

    private UserDTO convertToUserDTO(UserEntity user) {
        UserDTO dto = new UserDTO();
        UserDTO.RoleUser role = new UserDTO.RoleUser();
        if (user.getRole() != null) {
            role.setRoleId(user.getRole().getRoleId());
            role.setRoleName(user.getRole().getRoleName());
            dto.setRole(role);
        }

        dto.setId(user.getId());
        dto.setUsername(user.getUsername());
        dto.setEmail(user.getEmail());
        dto.setIsActive(user.getIsActive());
        dto.setCreatedBy(user.getCreatedBy());
        dto.setCreatedDate(user.getCreatedDate());
        dto.setUpdatedBy(user.getUpdatedBy());
        dto.setUpdatedDate(user.getUpdatedDate());
        return dto;
    }
    @Override
    public UserEntity CreateUser(CreateUserRequest dto) {
        // 2. Tạo UserEntity
        UserEntity user = new UserEntity();
        user.setEmail(dto.getEmail());
        user.setUsername(dto.getUsername());
        user.setPassword(passwordEncoder.encode(dto.getPassword()));
        user.setIsActive(true);

        // 3. Tạo UserInfoEntity
        UserInfoEntity info = new UserInfoEntity();
        info.setFullName(dto.getFullName());
        info.setPhoneNumber(dto.getPhone());
        info.setUser(user);         // liên kết ngược

        user.setUserInfo(info);     // gán userInfo vào user

        // 4. Lưu DB (cascade userInfo)
        return userRepository.save(user);
    }
    @Override
    public boolean isEmailExist(String email) {
        return userRepository.existsByEmail(email);
    }
    @Override
    public UserEntity handleFetchUserById(long id) {
        if (!this.userRepository.findById(id).isEmpty())
            return this.userRepository.findById(id).get();
        return null;
    }
    @Override
    public UserEntity handleUpdateUser(UserEntity user) {
        Optional<UserEntity> optional = this.userRepository.findById(user.getId());
        if (this.userRepository.existsByEmail(user.getEmail())) {
            optional.get().setUsername(user.getUsername());
            optional.get().setEmail(user.getEmail());
            optional.get().setIsActive(user.getIsActive());
            if (user.getRole() != null) {
                Optional<RoleEntity> optionalRole = this.roleService.fetchRoleById(user.getRole().getRoleId());
                optional.get().setRole(optionalRole.isEmpty() ? null : optionalRole.get());
            }

            return this.userRepository.save(optional.get());
        }
        return null;
    }
    @Override
    public UpdateUserDTO convertResUpdateUserDTO(UserEntity user) {
        UpdateUserDTO dto = new UpdateUserDTO();
        dto.setUsername(user.getUsername());
        dto.setEmail(user.getEmail());
        dto.setIsActive(user.getIsActive());
        dto.setUpdatedDate(user.getUpdatedDate());
        return dto;
    }

    @Override
    public void updateUserStatus(Long userId, boolean isActive) {
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        user.setIsActive(isActive);
        userRepository.save(user);
    }


}
