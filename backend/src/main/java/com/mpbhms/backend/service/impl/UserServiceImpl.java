package com.mpbhms.backend.service.impl;

import com.mpbhms.backend.dto.*;
import com.mpbhms.backend.entity.*;
import com.mpbhms.backend.exception.ResourceNotFoundException;
import com.mpbhms.backend.repository.UserRepository;
import com.mpbhms.backend.repository.RoleRepository;
import com.mpbhms.backend.repository.UserRoleRepository;
import com.mpbhms.backend.response.CreateUserDTOResponse;
import com.mpbhms.backend.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final UserRoleRepository userRoleRepository;

    public List<UserWithRoleDTO> getAllUsersWithRoles() {
        List<UserWithRoleDTO> users = userRepository.findAllUsersWithRoles();
        if (users.isEmpty()) {
            throw new ResourceNotFoundException("No users found");
        }
        return users;
    }
    public UserEntity createUserWithRenterRole(CreateUserDTO request) {
        // Tạo user
        UserEntity user = new UserEntity();
        user.setUsername(request.getUsername());
        user.setEmail(request.getEmail());
        user.setPassword(request.getPassword());
        // user.setIsActive(request.getIsActive());
        user.setCreatedBy("system");
        user = userRepository.save(user);
        // Gán role renter
        RoleEntity renterRole = roleRepository.findById(3L) // hoặc findByRoleName("RENTER")
                .orElseThrow(() -> new RuntimeException("Role not found"));
        UserRoleEntity userRole = new UserRoleEntity();
        userRole.setUser(user);
        userRole.setRole(renterRole);
        userRoleRepository.save(userRole);
        return user;
    }

    @Override
    public UserEntity getUserWithEmail(String email) {
    return this.userRepository.findByEmail(email);
    }

    @Override
    public CreateUserDTOResponse convertToCreateUserDTO(UserEntity entity) {
        CreateUserDTOResponse dto = new CreateUserDTOResponse();
        dto.setId(entity.getId());
        dto.setUsername(entity.getUsername());
        dto.setEmail(entity.getEmail());
        dto.setIsActive(entity.getIsActive());
        dto.setCreatedDate(entity.getCreatedDate());
        dto.setUpdatedDate(entity.getUpdatedDate());
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
    public UserDTO updateUserById(Long id, UpdateUserDTO request) {
        UserEntity user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy user với ID: " + id));

        // Cập nhật thông tin cơ bản
        if (request.getUsername() != null) user.setUsername(request.getUsername());
        if (request.getEmail() != null) user.setEmail(request.getEmail());
        if (request.getIsActive() != null) user.setIsActive(request.getIsActive());

        user.setUpdatedBy("system");
        user.setUpdatedDate(Instant.now());
        userRepository.save(user);

        // ✅ Cập nhật role nếu có roleId
        if (request.getRoleId() != null) {
            RoleEntity role = roleRepository.findById(request.getRoleId())
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy vai trò với ID: " + request.getRoleId()));

            Optional<UserRoleEntity> existingUserRole = userRoleRepository.findByUser(user);

            if (existingUserRole.isPresent()) {
                UserRoleEntity userRole = existingUserRole.get();
                userRole.setRole(role);
                userRoleRepository.save(userRole); // ✅ UPDATE
            } else {
                UserRoleEntity userRole = new UserRoleEntity();
                userRole.setUser(user);
                userRole.setRole(role);
                userRoleRepository.save(userRole); // ✅ INSERT
            }
        }

        return convertToUserDTO(user);
    }



}
