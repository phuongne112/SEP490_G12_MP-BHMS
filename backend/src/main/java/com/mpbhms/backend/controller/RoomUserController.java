package com.mpbhms.backend.controller;

import com.mpbhms.backend.dto.AddUserToRoomDTO;
import com.mpbhms.backend.dto.AddUserToRoomLDTO;
import com.mpbhms.backend.response.AddUserToRoomDTOResponse;
import com.mpbhms.backend.service.RoomUserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/mpbhms/rooms")
@RequiredArgsConstructor
public class RoomUserController {

    private final RoomUserService roomUserService;
    @PostMapping("/{roomId}/users")
    public ResponseEntity<AddUserToRoomDTOResponse> addUserToRoom(
            @PathVariable Long roomId,
            @RequestBody AddUserToRoomDTO request
    ) {
        AddUserToRoomDTOResponse response = roomUserService.addUserToRoom(roomId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/{roomId}/users/batch-with-role")
    public ResponseEntity<List<AddUserToRoomDTOResponse>> addMultipleUsersWithRole(
            @PathVariable Long roomId,
            @RequestBody AddUserToRoomLDTO request) {
        List<AddUserToRoomDTOResponse> res = roomUserService.addUserToRoomL(roomId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(res);
    }
}