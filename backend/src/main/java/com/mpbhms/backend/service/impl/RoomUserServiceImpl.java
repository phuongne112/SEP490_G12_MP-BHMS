package com.mpbhms.backend.service.impl;

import com.mpbhms.backend.dto.AddUserToRoomDTO;
import com.mpbhms.backend.dto.AddUserToRoomLDTO;
import com.mpbhms.backend.entity.RoomEntity;
import com.mpbhms.backend.entity.RoomUserEntity;
import com.mpbhms.backend.entity.UserEntity;
import com.mpbhms.backend.repository.RoomRepository;
import com.mpbhms.backend.repository.UserRepository;
import com.mpbhms.backend.repository.RoomUserRepository;
import com.mpbhms.backend.response.AddUserToRoomDTOResponse;
import com.mpbhms.backend.service.RoomUserService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class RoomUserServiceImpl implements RoomUserService {

    private final RoomRepository roomRepository;
    private final UserRepository userRepository;
    private final RoomUserRepository roomUserRepository;

    @Override
    public AddUserToRoomDTOResponse addUserToRoom(Long roomId, AddUserToRoomDTO request) {
        RoomUserEntity saved = saveRoomUserEntity(roomId, request);
        return convertToResponseDTO(saved);
    }

    private RoomUserEntity saveRoomUserEntity(Long roomId, AddUserToRoomDTO request) {
        RoomEntity room = roomRepository.findById(roomId)
                .orElseThrow(() -> new EntityNotFoundException("Room not found"));

        UserEntity user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new EntityNotFoundException("User not found"));

        boolean exists = roomUserRepository.existsByRoomAndUser(room, user);
        if (exists) {
            throw new IllegalArgumentException("User already in room");
        }

        RoomUserEntity roomUser = new RoomUserEntity();
        roomUser.setRoom(room);
        roomUser.setUser(user);
        roomUser.setRoleInRoom(RoomUserEntity.RoleInRoom.valueOf(request.getRoleInRoom()));
        roomUser.setJoinedAt(Instant.now());
        roomUser.setIsActive(true);

        return roomUserRepository.save(roomUser);
    }

    private AddUserToRoomDTOResponse convertToResponseDTO(RoomUserEntity saved) {
        UserEntity user = saved.getUser();
        RoomEntity room = saved.getRoom();

        AddUserToRoomDTOResponse res = new AddUserToRoomDTOResponse();
        res.setRoomUserId(saved.getId());
        res.setRoomId(room.getId());
        res.setUserId(user.getId());
        res.setUsername(user.getUsername());
        res.setEmail(user.getEmail());
        res.setRoleInRoom(saved.getRoleInRoom().name());
        res.setJoinedAt(saved.getJoinedAt());
        res.setIsActive(saved.getIsActive());

        return res;
    }

    @Override
    public List<AddUserToRoomDTOResponse> addUserToRoomL(Long roomId, AddUserToRoomLDTO request) {
        RoomEntity room = roomRepository.findById(roomId)
                .orElseThrow(() -> new EntityNotFoundException("Room not found"));

        RoomUserEntity.RoleInRoom role = RoomUserEntity.RoleInRoom.valueOf(request.getRoleInRoom());

        List<Long> existedUserIds = new ArrayList<>();
        List<AddUserToRoomDTOResponse> responses = new ArrayList<>();

        for (Long userId : request.getUserIds()) {
            UserEntity user = userRepository.findById(userId)
                    .orElseThrow(() -> new EntityNotFoundException("User not found: ID = " + userId));

            if (roomUserRepository.existsByRoomAndUser(room, user)) {
                existedUserIds.add(userId);
                continue;
            }

            // ✅ Thêm mới
            RoomUserEntity roomUser = new RoomUserEntity();
            roomUser.setRoom(room);
            roomUser.setUser(user);
            roomUser.setRoleInRoom(role);
            roomUser.setJoinedAt(Instant.now());
            roomUser.setIsActive(true);

            RoomUserEntity saved = roomUserRepository.save(roomUser);
            responses.add(convertToResponseDTO(saved));
        }
        if (!existedUserIds.isEmpty()) {
            throw new IllegalArgumentException("The following users are already in this room: " + existedUserIds);
        }

        return responses;
    }



}

