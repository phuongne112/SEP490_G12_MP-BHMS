package com.mpbhms.backend.service.impl;

import com.mpbhms.backend.dto.CreateUserDTO;
import com.mpbhms.backend.dto.UserWithRoleDTO;
import com.mpbhms.backend.entity.*;
import com.mpbhms.backend.exception.ResourceNotFoundException;
import com.mpbhms.backend.repository.UserRepository;
import com.mpbhms.backend.repository.RoleRepository;
import com.mpbhms.backend.repository.UserRoleRepository;
import com.mpbhms.backend.response.CreateUserDTOResponse;
import com.mpbhms.backend.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

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


}
