package com.mpbhms.backend.service.impl;

import com.mpbhms.backend.dto.*;
import com.mpbhms.backend.entity.*;
import com.mpbhms.backend.enums.Gender;
import com.mpbhms.backend.exception.BusinessException;
import com.mpbhms.backend.repository.PasswordResetTokenRepository;
import com.mpbhms.backend.repository.UserInfoRepository;
import com.mpbhms.backend.repository.UserRepository;
import com.mpbhms.backend.service.EmailService;
import com.mpbhms.backend.service.RoleService;
import com.mpbhms.backend.service.UserService;
import com.mpbhms.backend.util.SecurityUtil;
import com.mpbhms.backend.validation.PasswordValidator;
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

import com.mpbhms.backend.service.NotificationService;
import com.mpbhms.backend.dto.NotificationDTO;
import com.mpbhms.backend.enums.NotificationType;
import com.mpbhms.backend.enums.NotificationStatus;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {
    private final UserRepository userRepository;
    private final RoleService roleService;
    private final PasswordEncoder passwordEncoder;
    private final SecurityUtil securityUtil;
    private final EmailService emailService;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final NotificationService notificationService;
    private final UserInfoRepository userInfoRepository;
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
        // Map thông tin cá nhân nếu có
        if (user.getUserInfo() != null) {
            dto.setFullName(user.getUserInfo().getFullName());
            dto.setPhoneNumber(user.getUserInfo().getPhoneNumber());
        }
        return dto;
    }
    @Override
    public User createUser(CreateUserRequest dto) {
        Map<String, String> errors = new HashMap<>();

        // 1. Kiểm tra email đã tồn tại
        if (userRepository.existsByEmail(dto.getEmail())) {
            errors.put("email", "Email '" + dto.getEmail() + "' đã tồn tại");
        }

        // 2. Kiểm tra username đã tồn tại
        if (userRepository.existsByUsername(dto.getUsername())) {
            errors.put("username", "Tên đăng nhập '" + dto.getUsername() + "' đã tồn tại");
        }

        // 3. Kiểm tra số điện thoại đã tồn tại
        if (dto.getPhone() != null && userInfoRepository.existsByPhoneNumber(dto.getPhone())) {
            errors.put("phone", "Số điện thoại '" + dto.getPhone() + "' đã tồn tại");
        }
        // 4. Kiểm tra CCCD/CMND đã tồn tại
        if (dto.getCitizenId() != null && userInfoRepository.existsByNationalID(dto.getCitizenId())) {
            errors.put("citizenId", "Số CCCD/CMND '" + dto.getCitizenId() + "' đã tồn tại");
        }

        if (!errors.isEmpty()) {
            throw new BusinessException("Tạo người dùng thất bại", errors);
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
            errors.put("email", "Email '" + dto.getEmail() + "' đã tồn tại, vui lòng sử dụng email khác");
        }
        // 2. Kiểm tra username đã tồn tại
        if (isUsernameExist(dto.getUsername())) {
            errors.put("username", "Tên đăng nhập '" + dto.getUsername() + "' đã tồn tại, vui lòng chọn tên khác");
        }
        // 3. Kiểm tra số điện thoại đã tồn tại
        if (dto.getPhone() != null && userInfoRepository.existsByPhoneNumber(dto.getPhone())) {
            errors.put("phone", "Số điện thoại '" + dto.getPhone() + "' đã tồn tại");
        }
        // 4. Kiểm tra CCCD/CMND đã tồn tại
        if (dto.getCitizenId() != null && userInfoRepository.existsByNationalID(dto.getCitizenId())) {
            errors.put("citizenId", "Số CCCD/CMND '" + dto.getCitizenId() + "' đã tồn tại");
        }
        if (!errors.isEmpty()) {
            throw new BusinessException("Đăng ký thất bại", errors);
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
                .orElseThrow(() -> new BusinessException("Không tìm thấy người dùng với ID '" + dto.getId() + "'"));

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
            errors.put("email", "Email phải thuộc các domain được chấp nhận");
        }

        if (!existingUser.getEmail().equals(dto.getEmail())
                && userRepository.existsByEmail(dto.getEmail())) {
            errors.put("email", "Email '" + dto.getEmail() + "' đã tồn tại");
        }

        if (!existingUser.getUsername().equals(dto.getUsername())
                && userRepository.existsByUsername(dto.getUsername())) {
            errors.put("username", "Tên đăng nhập '" + dto.getUsername() + "' đã tồn tại");
        }

        if (!errors.isEmpty()) {
            throw new BusinessException("Cập nhật thất bại", errors);
        }

        Role oldRole = existingUser.getRole();
        Role newRole = null;
        if (dto.getRole() != null && dto.getRole().getRoleId() != null) {
            newRole = roleService.fetchRoleById(dto.getRole().getRoleId())
                    .orElseThrow(() -> new BusinessException("Role not found"));
            existingUser.setRole(newRole);
        }

        existingUser.setUsername(dto.getUsername());
        existingUser.setEmail(dto.getEmail());

        User savedUser = userRepository.save(existingUser);
        // Gửi thông báo nếu role bị thay đổi
        if (oldRole == null || newRole == null || !oldRole.getId().equals(newRole.getId())) {
            NotificationDTO noti = new NotificationDTO();
            noti.setTitle("Quyền của bạn đã được cập nhật");
            noti.setMessage("Quyền tài khoản của bạn đã được thay đổi thành: " + (newRole != null ? newRole.getRoleName() : "Không có"));
            noti.setType(NotificationType.ANNOUNCEMENT);
            noti.setRecipientId(savedUser.getId());
            noti.setRecipientEmail(savedUser.getEmail());
            noti.setStatus(NotificationStatus.SENT);
            notificationService.createAndSend(noti);
        }
        return savedUser;
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
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy người dùng"));

                user.setIsActive(isActive);
                userRepository.save(user);
            }

    @Override
    public void changePasswordUser(String email, String currentPassword, String newPassword) {
        User user = userRepository.findByEmail(email);

        Map<String, String> errors = new HashMap<>();

        // Log để debug kiểm tra giá trị thực tế
        System.out.println("Current: " + currentPassword + ", New: " + newPassword);
        System.out.println("Hash: " + user.getPassword());
        System.out.println("Match new == old? " + passwordEncoder.matches(newPassword, user.getPassword()));

        // Kiểm tra mật khẩu hiện tại
        if (!passwordEncoder.matches(currentPassword, user.getPassword())) {
            errors.put("currentPassword", "Mật khẩu hiện tại không đúng");
        }

        // Kiểm tra newPassword bằng regex
        if (newPassword.length() >= 20) {
            errors.put("newPassword", "Mật khẩu không được vượt quá 20 ký tự.");
        } else {
            String pattern = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@#$%^&+=!]).{8,}$";
            if (!newPassword.matches(pattern)) {
                errors.put("newPassword", "Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt.");
            }
        }

        // Kiểm tra mật khẩu mới phải khác mật khẩu cũ
        if (passwordEncoder.matches(newPassword, user.getPassword())) {
            errors.put("newPassword", "Mật khẩu mới phải khác mật khẩu hiện tại.");
        }

        if (!errors.isEmpty()) {
            throw new BusinessException("Đổi mật khẩu thất bại", errors);
        }

        // Cập nhật mật khẩu mới
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
    }

    @Override
        @Transactional
        public void sendResetPasswordToken(String email) {
            User user = userRepository.findByEmail(email);
            if (user == null) {
                throw new RuntimeException("Không tìm thấy người dùng");
            }

            Instant expiry = Instant.now().plus(Duration.ofSeconds(120));
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
                    .orElseThrow(() -> new RuntimeException("Token không hợp lệ"));

            if (resetToken.isUsed()) {
                throw new RuntimeException("Token đã được sử dụng");
            }

            if (resetToken.getExpiryDate().isBefore(Instant.now())) {
                throw new RuntimeException("Token đã hết hạn");
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
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng"));

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
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng"));

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
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng"));

        UserInfo info = user.getUserInfo();
        if (info == null) {
            info = new UserInfo();
            info.setUser(user);
        }

        Map<String, String> errors = new HashMap<>();
        // Kiểm tra trùng số điện thoại với user khác
        if (request.getPhoneNumber() != null &&
            userInfoRepository.existsByPhoneNumberAndUserIdNot(request.getPhoneNumber(), user.getId())) {
            errors.put("phoneNumber", "Số điện thoại đã tồn tại ở tài khoản khác");
        }
        // Kiểm tra trùng CCCD/CMND với user khác
        if (request.getNationalID() != null &&
            userInfoRepository.existsByNationalIDAndUserIdNot(request.getNationalID(), user.getId())) {
            errors.put("nationalID", "Số CCCD/CMND đã tồn tại ở tài khoản khác");
        }
        // Kiểm tra trùng số điện thoại phụ
        if (request.getPhoneNumber2() != null) {
            // Không trùng với số chính của bất kỳ user nào (trừ chính mình)
            if (userInfoRepository.existsByPhoneNumberAndUserIdNot(request.getPhoneNumber2(), user.getId())) {
                errors.put("phoneNumber2", "Số điện thoại phụ đã tồn tại ở tài khoản khác (trùng số chính)");
            }
            // Không trùng với số phụ của bất kỳ user nào (trừ chính mình)
            if (userInfoRepository.existsByPhoneNumber2AndUserIdNot(request.getPhoneNumber2(), user.getId())) {
                errors.put("phoneNumber2", "Số điện thoại phụ đã tồn tại ở tài khoản khác (trùng số phụ)");
            }
            // Không trùng với số chính của chính mình
            if (request.getPhoneNumber() != null && request.getPhoneNumber2().equals(request.getPhoneNumber())) {
                errors.put("phoneNumber2", "Số điện thoại phụ không được trùng với số điện thoại chính");
            }
        }
        if (!errors.isEmpty()) {
            throw new BusinessException("Cập nhật thông tin cá nhân thất bại", errors);
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
    public void addUserInfo(Long userId, UserInfoDtoRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng"));

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
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng"));

        Map<String, String> errors = new HashMap<>();

        if (!user.getEmail().equals(request.getEmail())
                && userRepository.existsByEmail(request.getEmail())) {
            errors.put("email", "Email đã tồn tại");
        }

        if (!user.getUsername().equals(request.getUsername())
                && userRepository.existsByUsername(request.getUsername())) {
            errors.put("username", "Tên đăng nhập đã tồn tại");
        }

        if (request.getPassword() != null && !request.getPassword().isBlank()) {
            PasswordValidator validator = new PasswordValidator();
            if (!validator.isValid(request.getPassword(), null)) {
                // Gọi riêng validator để lấy đúng message
                if (request.getPassword().length() >= 20) {
                    errors.put("password", "Mật khẩu không được vượt quá 20 ký tự.");
                } else {
                    errors.put("password", "Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt.");
                }
            }
        }

        if (!errors.isEmpty()) {
            throw new BusinessException("Cập nhật tài khoản thất bại", errors);
        }

        user.setEmail(request.getEmail());
        user.setUsername(request.getUsername());

        if (request.getPassword() != null && !request.getPassword().isBlank()) {
            user.setPassword(passwordEncoder.encode(request.getPassword()));
        }

        userRepository.save(user);
    }

}

