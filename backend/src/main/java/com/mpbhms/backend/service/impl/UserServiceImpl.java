package com.mpbhms.backend.service.impl;

import com.mpbhms.backend.dto.*;
import com.mpbhms.backend.entity.*;
import com.mpbhms.backend.exception.IdInvalidException;
import com.mpbhms.backend.repository.UserRepository;
import com.mpbhms.backend.service.EmailService;
import com.mpbhms.backend.service.RoleService;
import com.mpbhms.backend.service.UserService;
import com.mpbhms.backend.util.SecurityUtil;
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
    private final SecurityUtil securityUtil;
    private final EmailService emailService;

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
            role.setRoleId(user.getRole().getId());
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
    public UserEntity Register(UserEntity user) {
        if (user.getRole() != null) {
            Optional<RoleEntity> optional = roleService.fetchRoleById(user.getRole().getId());
            if (optional.isEmpty()) {
                throw new IdInvalidException("Role với ID " + user.getRole().getId() + " không tồn tại.");
            }
            user.setRole(optional.get());
        }

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

        if (optional.isPresent()) {
            UserEntity existingUser = optional.get();

            // Kiểm tra nếu email bị đổi và đã bị người khác dùng thì không cho cập nhật
            if (!existingUser.getEmail().equals(user.getEmail())
                    && this.userRepository.existsByEmail(user.getEmail())) {
                return null; // hoặc throw exception nếu muốn chi tiết hơn
            }

            existingUser.setUsername(user.getUsername());
            existingUser.setEmail(user.getEmail());
            existingUser.setIsActive(user.getIsActive());

            if (user.getRole() != null && user.getRole().getId() != null) {
                Optional<RoleEntity> optionalRole = this.roleService.fetchRoleById(user.getRole().getId());
                existingUser.setRole(optionalRole.orElse(null));
            }

            return this.userRepository.save(existingUser);
        }

        return null;
    }

    @Override
    public UpdateUserDTO convertResUpdateUserDTO(UserEntity user) {
        UpdateUserDTO dto = new UpdateUserDTO();
        dto.setUsername(user.getUsername());
        dto.setEmail(user.getEmail());
        dto.setIsActive(user.getIsActive());
        dto.setRoleId(user.getRole() != null ? user.getRole().getId() : null);
        return dto;
    }
            @Override
            public void updateUserStatus (Long userId,boolean isActive){
                UserEntity user = userRepository.findById(userId)
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

                user.setIsActive(isActive);
                userRepository.save(user);
            }

            @Override
            public String changePasswordUser (String email, String currentPassword, String newPassword){
                UserEntity user = userRepository.findByEmail(email);

                if (!passwordEncoder.matches(currentPassword, user.getPassword())) {
                    return "Mật khẩu hiện tại không đúng.";
                }

                user.setPassword(passwordEncoder.encode(newPassword));
                userRepository.save(user);
                return "Cập nhật mật khẩu thành công.";
            }

            @Override
            public void sendResetPasswordToken (String email){

                String token = securityUtil.generateResetToken(email);
                emailService.sendPasswordResetLink(email, token);
            }

            @Override
            public void resetPassword (String token, String newPassword){
                String email = securityUtil.extractEmailFromResetToken(token);

                UserEntity user = userRepository.findByEmail(email);

                user.setPassword(passwordEncoder.encode(newPassword));
                userRepository.save(user);
            }


        }

