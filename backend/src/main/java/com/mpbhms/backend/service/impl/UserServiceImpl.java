package com.mpbhms.backend.service.impl;

import com.mpbhms.backend.dto.*;
import com.mpbhms.backend.entity.*;
import com.mpbhms.backend.enums.Gender;
import com.mpbhms.backend.exception.BusinessException;
import com.mpbhms.backend.repository.PasswordResetTokenRepository;
import com.mpbhms.backend.repository.UserRepository;
import com.mpbhms.backend.service.EmailService;
import com.mpbhms.backend.service.RoleService;
import com.mpbhms.backend.service.UserService;
import com.mpbhms.backend.util.SecurityUtil;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {
    private final UserRepository userRepository;
    private final RoleService roleService;
    private final PasswordEncoder passwordEncoder;
    private final SecurityUtil securityUtil;
    private final EmailService emailService;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    @Override
    public User getUserWithEmail(String email) {
    return this.userRepository.findByEmail(email);
    }

    public User handleGetUserByUsername(String username) {
        return this.userRepository.findByEmail(username);
    }
    @Override
    public CreateUserResponse convertToCreateUserDTO(User entity) {
        CreateUserResponse dto = new CreateUserResponse();
        dto.setUsername(entity.getUsername());
        dto.setEmail(entity.getEmail());
        dto.setIsActive(entity.getIsActive());
        dto.setCreatedDate(entity.getCreatedDate());
        return dto;
    }

    @Override
    public void updateUserToken(String token, String email) {
        User currentUser = this.getUserWithEmail(email);
        if (currentUser != null) {
            currentUser.setRefreshToken(token);
            userRepository.save(currentUser); // lưu lại thay đổi
        }
    }

    @Override
    public User getUserByRefreshTokenAndEmail(String refreshToken, String email) {
        return this.userRepository.findByRefreshTokenAndEmail(refreshToken, email);
    }
    @Override
    public ResultPaginationDTO getAllUsers(Specification<User> spec, Pageable pageable) {
        Page<User> userPage = userRepository.findAll(spec, pageable);
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

    private UserDTO convertToUserDTO(User user) {
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
    public User createUser(CreateUserRequest dto) {
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
        User user = new User();
        user.setEmail(dto.getEmail());
        user.setUsername(dto.getUsername());
        user.setPassword(passwordEncoder.encode(dto.getPassword()));
        user.setIsActive(true);

        // 4. Tạo UserInfoEntity
        UserInfo info = new UserInfo();
        info.setFullName(dto.getFullName());
        info.setPhoneNumber(dto.getPhone());
        info.setUser(user);         // liên kết ngược
        user.setUserInfo(info);     // gán userInfo vào user

        // 5. Lưu DB (cascade userInfo)
        return userRepository.save(user);
    }

    public User signUp(CreateUserRequest dto) {
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
        User user = new User();
        user.setEmail(dto.getEmail());
        user.setUsername(dto.getUsername());
        user.setPassword(passwordEncoder.encode(dto.getPassword()));
        user.setIsActive(true);

        // 4. Tạo UserInfoEntity
        UserInfo info = new UserInfo();
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
    public User handleFetchUserById(long id) {
        if (!this.userRepository.findById(id).isEmpty())
            return this.userRepository.findById(id).get();
        return null;
    }
    @Override
    public User handleUpdateUser(UpdateUserDTO dto) {
        User existingUser = this.userRepository.findById(dto.getId())
                .orElseThrow(() -> new BusinessException("User with ID '" + dto.getId() + "' not found"));

        Map<String, String> errors = new HashMap<>();

        String allowedEmailRegex = "^[A-Za-z0-9._%+-]+@(gmail\\.com(\\.vn)?"
                + "|fpt\\.edu\\.vn"
                + "|student\\.hust\\.edu\\.vn"
                + "|hcmut\\.edu\\.vn"
                + "|stu\\.edu\\.vn"
                + "|vnuit\\.edu\\.vn"
                + "|[A-Za-z0-9.-]+\\.edu\\.vn"
                + ")$";

        if (!dto.getEmail().matches(allowedEmailRegex)) {
            errors.put("email", "Email must belong to an accepted domain");
        }

        if (!existingUser.getEmail().equals(dto.getEmail())
                && userRepository.existsByEmail(dto.getEmail())) {
            errors.put("email", "Email '" + dto.getEmail() + "' already exists");
        }

        if (!existingUser.getUsername().equals(dto.getUsername())
                && userRepository.existsByUsername(dto.getUsername())) {
            errors.put("username", "Username '" + dto.getUsername() + "' already exists");
        }

        if (!errors.isEmpty()) {
            throw new BusinessException("Update failed", errors);
        }

        existingUser.setUsername(dto.getUsername());
        existingUser.setEmail(dto.getEmail());

        if (dto.getRole() != null && dto.getRole().getRoleId() != null) {
            Role role = roleService.fetchRoleById(dto.getRole().getRoleId())
                    .orElseThrow(() -> new BusinessException("Role not found"));
            existingUser.setRole(role);
        }

        return userRepository.save(existingUser);
    }

    @Override
    public UpdateUserDTO convertResUpdateUserDTO(User user) {
        UpdateUserDTO dto = new UpdateUserDTO();
        dto.setId(user.getId());
        dto.setUsername(user.getUsername());
        dto.setEmail(user.getEmail());
        if (user.getRole() != null) {
            UpdateUserDTO.RoleDTO roleDTO = new UpdateUserDTO.RoleDTO();
            roleDTO.setRoleId(user.getRole().getId());
            dto.setRole(roleDTO);
        }

        return dto;
    }

    @Override
            public void updateUserStatus (Long userId,boolean isActive){
                User user = userRepository.findById(userId)
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

                user.setIsActive(isActive);
                userRepository.save(user);
            }

            @Override
            public String changePasswordUser (String email, String currentPassword, String newPassword){
                User user = userRepository.findByEmail(email);

                if (!passwordEncoder.matches(currentPassword, user.getPassword())) {
                    return "Mật khẩu hiện tại không đúng.";
                }

                user.setPassword(passwordEncoder.encode(newPassword));
                userRepository.save(user);
                return "Cập nhật mật khẩu thành công.";
            }

        @Override
        @Transactional
        public void sendResetPasswordToken(String email) {
            User user = userRepository.findByEmail(email);
            if (user == null) {
                throw new RuntimeException("User not found");
            }

            Instant expiry = Instant.now().plus(Duration.ofSeconds(30));
            String token = securityUtil.generateResetToken(email, expiry);

            LocalDate today = LocalDate.now();
            PasswordResetToken resetToken = passwordResetTokenRepository.findByUser_Id(user.getId()).orElse(null);
            if (resetToken != null) {
                if (today.equals(resetToken.getLastRequestDate())) {
                    if (resetToken.getRequestCount() >= 3) {
                        throw new RuntimeException("Bạn đã yêu cầu quá 3 lần trong ngày. Vui lòng thử lại vào ngày mai.");
                    }
                    resetToken.setRequestCount(resetToken.getRequestCount() + 1);
                } else {
                    resetToken.setRequestCount(1);
                    resetToken.setLastRequestDate(today);
                }
                resetToken.setToken(token);
                resetToken.setExpiryDate(expiry);
                resetToken.setUsed(false);
            } else {
                resetToken = new PasswordResetToken();
                resetToken.setUser(user);
                resetToken.setToken(token);
                resetToken.setExpiryDate(expiry);
                resetToken.setUsed(false);
                resetToken.setRequestCount(1);
                resetToken.setLastRequestDate(today);
            }
            passwordResetTokenRepository.save(resetToken);
            emailService.sendPasswordResetLink(email, token);
        }

        @Override
        @Transactional
        public void resetPassword(String token, String newPassword) {
            PasswordResetToken resetToken = passwordResetTokenRepository.findByToken(token)
                    .orElseThrow(() -> new RuntimeException("Invalid token"));

            if (resetToken.isUsed()) {
                throw new RuntimeException("Token has already been used");
            }

            if (resetToken.getExpiryDate().isBefore(Instant.now())) {
                throw new RuntimeException("Token has expired");
            }

            User user = resetToken.getUser();
            user.setPassword(passwordEncoder.encode(newPassword));
            userRepository.save(user);

            // Mark token as used
            resetToken.setUsed(true);
            passwordResetTokenRepository.save(resetToken);
        }


            @Override
            public boolean isUsernameExist(String username) {
                return userRepository.existsByUsername(username);
            }

    @Override
    public UserAccountDtoResponse getUserAccountById(Long id) {
        User user = userRepository.findById(id)
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
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        UserInfo info = user.getUserInfo();
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
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        UserInfo info = user.getUserInfo();
        if (info == null) {
            info = new UserInfo();
            info.setUser(user);
        }

        info.setFullName(request.getFullName());
        info.setPhoneNumber(request.getPhoneNumber());
        info.setPhoneNumber2(request.getPhoneNumber2());
        info.setGender(request.getGender() != null ? Gender.valueOf(request.getGender()) : null);
        info.setBirthDate(request.getBirthDate());
        info.setBirthPlace(request.getBirthPlace());
        info.setNationalID(request.getNationalID());
        info.setNationalIDIssuePlace(request.getNationalIDIssuePlace());
        info.setPermanentAddress(request.getPermanentAddress());

        user.setUserInfo(info); // nếu cascade thì sẽ tự lưu info khi lưu user
        userRepository.save(user);
    }

    public void updateUserAccount(Long userId, UserAccountDtoRequest request) {
        User user = userRepository.findById(userId)
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

