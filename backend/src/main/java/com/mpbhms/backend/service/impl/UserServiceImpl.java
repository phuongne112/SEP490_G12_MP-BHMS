package com.mpbhms.backend.service.impl;

import com.mpbhms.backend.dto.*;
import com.mpbhms.backend.entity.*;
import com.mpbhms.backend.exception.BusinessException;
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

import java.util.HashMap;
import java.util.List;
import java.util.Map;
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
    public UserEntity createUser(CreateUserRequest dto) {
        Map<String, String> errors = new HashMap<>();

        // 1. Kiểm tra email đã tồn tại
        if (userRepository.existsByEmail(dto.getEmail())) {
            errors.put("email", "Email '" + dto.getEmail() + "' already exists");
        }

        // 2. Kiểm tra username đã tồn tại
        if (userRepository.existsByUsername(dto.getUsername())) {
            errors.put("username", "Username '" + dto.getUsername() + "' already exists");
        }

        if (!errors.isEmpty()) {
            throw new BusinessException("Create user failed", errors);
        }

        // 3. Tạo UserEntity
        UserEntity user = new UserEntity();
        user.setEmail(dto.getEmail());
        user.setUsername(dto.getUsername());
        user.setPassword(passwordEncoder.encode(dto.getPassword()));
        user.setIsActive(true);

        // 4. Tạo UserInfoEntity
        UserInfoEntity info = new UserInfoEntity();
        info.setFullName(dto.getFullName());
        info.setPhoneNumber(dto.getPhone());
        info.setUser(user);         // liên kết ngược
        user.setUserInfo(info);     // gán userInfo vào user

        // 5. Lưu DB (cascade userInfo)
        return userRepository.save(user);
    }

    public UserEntity signUp(CreateUserRequest dto) {
        Map<String, String> errors = new HashMap<>();
        // 1. Kiểm tra email đã tồn tại
        if (isEmailExist(dto.getEmail())) {
            throw new BusinessException("Email '" + dto.getEmail() + "' already exists, please use another email");
        }

        // 2. Kiểm tra username đã tồn tại
        if (isUsernameExist(dto.getUsername())) {
            throw new BusinessException("Username '" + dto.getUsername() + "' already exists, please choose another username");
        }

        // 3. Tạo UserEntity
        UserEntity user = new UserEntity();
        user.setEmail(dto.getEmail());
        user.setUsername(dto.getUsername());
        user.setPassword(passwordEncoder.encode(dto.getPassword()));
        user.setIsActive(true);

        // 4. Tạo UserInfoEntity
        UserInfoEntity info = new UserInfoEntity();
        info.setFullName(dto.getFullName());
        info.setPhoneNumber(dto.getPhone());
        info.setUser(user);         // liên kết ngược

        user.setUserInfo(info);     // gán userInfo vào user

        // 5. Lưu DB (cascade userInfo)
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
        UserEntity existingUser = this.userRepository.findById(user.getId())
                .orElseThrow(() -> new BusinessException("User with ID '" + user.getId() + "' not found"));

        Map<String, String> errors = new HashMap<>();

        // Regex kiểm tra email theo các domain cho phép
        String allowedEmailRegex = "^[A-Za-z0-9._%+-]+@(gmail\\.com(\\.vn)?"
                + "|fpt\\.edu\\.vn"
                + "|student\\.hust\\.edu\\.vn"
                + "|hcmut\\.edu\\.vn"
                + "|stu\\.edu\\.vn"
                + "|vnuit\\.edu\\.vn"
                + "|[A-Za-z0-9.-]+\\.edu\\.vn"
                + ")$";

        if (!user.getEmail().matches(allowedEmailRegex)) {
            errors.put("newEmail", "Email must belong to an accepted domain (e.g., gmail.com, fpt.edu.vn, etc.)");
        }

        // Kiểm tra email đã tồn tại
        if (!existingUser.getEmail().equals(user.getEmail())
                && this.userRepository.existsByEmail(user.getEmail())) {
            errors.put("newEmail", "Email '" + user.getEmail() + "' already exists");
        }

        // Kiểm tra username đã tồn tại
        if (!existingUser.getUsername().equals(user.getUsername())
                && this.userRepository.existsByUsername(user.getUsername())) {
            errors.put("username", "Username '" + user.getUsername() + "' already exists");
        }

        if (!errors.isEmpty()) {
            throw new BusinessException("Update failed", errors);
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

            @Override
            public boolean isUsernameExist(String username) {
                return userRepository.existsByUsername(username);
            }

    @Override
    public UserAccountDtoResponse getUserAccountById(Long id) {
        UserEntity user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));

        UserAccountDtoResponse dto = new UserAccountDtoResponse();
        dto.setId(user.getId());
        dto.setUsername(user.getUsername());
        dto.setEmail(user.getEmail());

        // 👉 Lấy fullName từ userInfo nếu có
        if (user.getUserInfo() != null) {
            dto.setFullName(user.getUserInfo().getFullName());
        }

        return dto;
    }

    @Override
    public UserInfoDtoResponse getUserInfoById(Long userId) {
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        UserInfoEntity info = user.getUserInfo();
        if (info == null) {
            throw new RuntimeException("User info not found");
        }

        UserInfoDtoResponse dto = new UserInfoDtoResponse();
        dto.setFullName(info.getFullName());
        dto.setPhoneNumber(info.getPhoneNumber());
        dto.setPhoneNumber2(info.getPhoneNumber2());
        dto.setGender(info.getGender() != null ? info.getGender().name() : null);
        dto.setBirthDate(info.getBirthDate());
        dto.setBirthPlace(info.getBirthPlace());
        dto.setNationalID(info.getNationalID());
        dto.setNationalIDIssuePlace(info.getNationalIDIssuePlace());
        dto.setPermanentAddress(info.getPermanentAddress());

        return dto;
    }
    public void updateUserInfo(Long userId, UserInfoDtoRequest request) {
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        UserInfoEntity info = user.getUserInfo();
        if (info == null) {
            info = new UserInfoEntity();
            info.setUser(user);
        }

        info.setFullName(request.getFullName());
        info.setPhoneNumber(request.getPhoneNumber());
        info.setPhoneNumber2(request.getPhoneNumber2());
        info.setGender(request.getGender() != null ? UserInfoEntity.Gender.valueOf(request.getGender()) : null);
        info.setBirthDate(request.getBirthDate());
        info.setBirthPlace(request.getBirthPlace());
        info.setNationalID(request.getNationalID());
        info.setNationalIDIssuePlace(request.getNationalIDIssuePlace());
        info.setPermanentAddress(request.getPermanentAddress());

        user.setUserInfo(info); // nếu cascade thì sẽ tự lưu info khi lưu user
        userRepository.save(user);
    }

    public void updateUserAccount(Long userId, UserAccountDtoRequest request) {
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Map<String, String> errors = new HashMap<>();

        // Kiểm tra email trùng (nếu có thay đổi)
        if (!user.getEmail().equals(request.getEmail())
                && userRepository.existsByEmail(request.getEmail())) {
            errors.put("email", "Email already exists");
        }

        // Kiểm tra username trùng (nếu có thay đổi)
        if (!user.getUsername().equals(request.getUsername())
                && userRepository.existsByUsername(request.getUsername())) {
            errors.put("username", "Username already exists");
        }

        if (!errors.isEmpty()) {
            throw new BusinessException("Update account failed", errors);
        }

        user.setEmail(request.getEmail());
        user.setUsername(request.getUsername());

        if (request.getPassword() != null && !request.getPassword().isBlank()) {
            user.setPassword(passwordEncoder.encode(request.getPassword()));
        }

        userRepository.save(user);
    }


}

