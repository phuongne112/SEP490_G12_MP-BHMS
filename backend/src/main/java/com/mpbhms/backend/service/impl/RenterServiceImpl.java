package com.mpbhms.backend.service.impl;

import com.mpbhms.backend.dto.*;
import com.mpbhms.backend.entity.Role;
import com.mpbhms.backend.entity.User;
import com.mpbhms.backend.entity.UserInfo;
import com.mpbhms.backend.entity.RoomUser;
import com.mpbhms.backend.entity.Room;
import com.mpbhms.backend.exception.BusinessException;
import com.mpbhms.backend.repository.RoleRepository;
import com.mpbhms.backend.repository.UserRepository;
import com.mpbhms.backend.repository.RoomUserRepository;
import com.mpbhms.backend.repository.RoomRepository;
import com.mpbhms.backend.service.RenterService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.security.crypto.password.PasswordEncoder;
import com.mpbhms.backend.dto.RenterRoomInfoDTO;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.*;

@Service
@RequiredArgsConstructor
public class RenterServiceImpl implements RenterService {

    private static final Logger logger = LoggerFactory.getLogger(RenterServiceImpl.class);

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final RoomUserRepository roomUserRepository;
    private final RoomRepository roomRepository;

    @Override
    public ResultPaginationDTO getAllRenters(Specification<?> spec, Pageable pageable, String search) {
        Specification<User> specWithRole = ((Specification<User>) spec).and((root, query, cb) ->
                cb.equal(root.get("role").get("id"), 2)
        );

        // Lấy tất cả user matching spec (không phân trang ở DB)
        List<User> allUsers = userRepository.findAll(specWithRole, Pageable.unpaged()).getContent();
        // Filter search trước
        List<User> filteredUsers = allUsers.stream()
            .filter(user -> {
                if (search != null && !search.isEmpty()) {
                    return user.getUsername() != null &&
                        user.getUsername().toLowerCase().contains(search.toLowerCase());
                }
                return true;
            })
            .toList();

        // Phân trang lại thủ công
        int page = pageable.getPageNumber();
        int size = pageable.getPageSize();
        int start = page * size;
        int end = Math.min(start + size, filteredUsers.size());
        List<UserDTO> userDTOs = (start < end)
            ? filteredUsers.subList(start, end).stream().map(this::convertToUserDTOWithRoom).toList()
            : new ArrayList<>();

        Meta meta = new Meta();
        meta.setPage(page + 1);
        meta.setPageSize(size);
        meta.setPages((int) Math.ceil((double) filteredUsers.size() / size));
        meta.setTotal(filteredUsers.size());

        ResultPaginationDTO result = new ResultPaginationDTO();
        result.setMeta(meta);
        result.setResult(userDTOs);
        return result;
    }

    @Override
    public CreateUserResponse createRenter(CreateUserRequest dto) {
        Map<String, String> errors = new HashMap<>();

        if (userRepository.existsByEmail(dto.getEmail())) {
            errors.put("email", "Email '" + dto.getEmail() + "' đã tồn tại");
        }
        if (userRepository.existsByUsername(dto.getUsername())) {
            errors.put("username", "Tên đăng nhập '" + dto.getUsername() + "' đã tồn tại");
        }
        if (!errors.isEmpty()) {
            throw new BusinessException("Tạo người thuê thất bại", errors);
        }

        User user = new User();
        user.setEmail(dto.getEmail());
        user.setUsername(dto.getUsername());
        user.setPassword(passwordEncoder.encode(dto.getPassword()));
        user.setIsActive(true);

        Role renterRole = roleRepository.findById(2L)
                .orElseThrow(() -> new BusinessException("Không tìm thấy vai trò người thuê (ID = 2)"));
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
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy người dùng"));

        if (user.getRole() == null || user.getRole().getId() != 2) {
            throw new BusinessException("Người dùng không phải là người thuê");
        }

        logger.info("[updateRenterStatus] userId={}, currentIsActive={}, newIsActive={}", userId, user.getIsActive(), isActive);
        user.setIsActive(isActive);
        userRepository.save(user);
        logger.info("[updateRenterStatus] userId={} saved, afterSaveIsActive={}", userId, user.getIsActive());
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
        if (user.getUserInfo() != null) {
            dto.setFullName(user.getUserInfo().getFullName());
            dto.setPhoneNumber(user.getUserInfo().getPhoneNumber());
        }
        return dto;
    }

    public List<UserDTO> getRentersForAssign(String keyword) {
        List<User> users = userRepository.findRentersWithoutActiveRoomAndSearch(keyword == null ? "" : keyword);
        return users.stream().map(this::convertToUserDTO).toList();
    }

    private UserDTO convertToUserDTOWithRoom(User user) {
        UserDTO dto = convertToUserDTO(user);
        RoomUser roomUser = roomUserRepository.findTopByUserIdOrderByJoinedAtDesc(user.getId());
        if (roomUser != null) {
            Room room = roomUser.getRoom();
            RenterRoomInfoDTO info = new RenterRoomInfoDTO();
            info.setRoomName(room != null ? room.getRoomNumber() : null);
            info.setCheckInDate(roomUser.getJoinedAt());
            dto.setRenterRoomInfo(info);
        }
        return dto;
    }

    @Override
    public List<UserDTO> getAllRentersWithInfo() {
        List<User> users = userRepository.findAll();
        List<UserDTO> renters = new ArrayList<>();
        for (User user : users) {
            if (user.getRole() != null && user.getRole().getId() == 2) {
                renters.add(convertToUserDTO(user));
            }
        }
        return renters;
    }
}
