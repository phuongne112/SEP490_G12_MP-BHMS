package com.mpbhms.backend.service.impl;

import com.mpbhms.backend.dto.*;
import com.mpbhms.backend.entity.Role;
import com.mpbhms.backend.entity.User;
import com.mpbhms.backend.entity.UserInfo;
import com.mpbhms.backend.exception.BusinessException;
import com.mpbhms.backend.repository.RoleRepository;
import com.mpbhms.backend.repository.UserRepository;
import com.mpbhms.backend.service.RenterService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.*;

@Service
@RequiredArgsConstructor
public class RenterServiceImpl implements RenterService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public ResultPaginationDTO getAllRenters(Specification<?> spec, Pageable pageable) {
        Specification<User> specWithRole = ((Specification<User>) spec).and((root, query, cb) ->
                cb.equal(root.get("role").get("id"), 2)
        );

        Page<User> userPage = userRepository.findAll(specWithRole, pageable);
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

    @Override
    public CreateUserResponse createRenter(CreateUserRequest dto) {
        Map<String, String> errors = new HashMap<>();

        if (userRepository.existsByEmail(dto.getEmail())) {
            errors.put("email", "Email '" + dto.getEmail() + "' already exists");
        }
        if (userRepository.existsByUsername(dto.getUsername())) {
            errors.put("username", "Username '" + dto.getUsername() + "' already exists");
        }
        if (!errors.isEmpty()) {
            throw new BusinessException("Create renter failed", errors);
        }

        User user = new User();
        user.setEmail(dto.getEmail());
        user.setUsername(dto.getUsername());
        user.setPassword(passwordEncoder.encode(dto.getPassword()));
        user.setIsActive(true);

        Role renterRole = roleRepository.findById(2L)
                .orElseThrow(() -> new BusinessException("Renter role not found (ID = 2)"));
        user.setRole(renterRole);

        UserInfo info = new UserInfo();
        info.setFullName(dto.getFullName());
        info.setPhoneNumber(dto.getPhone());
        info.setUser(user);

        user.setUserInfo(info);

        user = userRepository.save(user);

        return convertToCreateUserDTO(user);
    }

    @Override
    public void updateRenterStatus(Long userId, boolean isActive) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        if (user.getRole() == null || user.getRole().getId() != 2) {
            throw new BusinessException("User is not a renter");
        }

        user.setIsActive(isActive);
        userRepository.save(user);
    }

    public CreateUserResponse convertToCreateUserDTO(User entity) {
        CreateUserResponse dto = new CreateUserResponse();
        dto.setUsername(entity.getUsername());
        dto.setEmail(entity.getEmail());
        dto.setIsActive(entity.getIsActive());
        dto.setCreatedDate(entity.getCreatedDate());
        return dto;
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

    public List<UserDTO> getRentersForAssign(String keyword) {
        List<User> users = userRepository.findRentersWithoutActiveRoomAndSearch(keyword == null ? "" : keyword);
        return users.stream().map(this::convertToUserDTO).toList();
    }
}
