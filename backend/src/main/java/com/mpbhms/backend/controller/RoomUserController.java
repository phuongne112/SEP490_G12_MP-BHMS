package com.mpbhms.backend.controller;

import com.mpbhms.backend.dto.AddUsersToRoomRequest;
import com.mpbhms.backend.service.RoomUserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/mpbhms/room-users")
@RequiredArgsConstructor
public class RoomUserController {

    private final RoomUserService roomUserService;

    @PostMapping("/add-many")
    public ResponseEntity<?> addUsersToRoom(@RequestBody AddUsersToRoomRequest request) {
        roomUserService.addUsersToRoom(request);
        return ResponseEntity.ok("Đã thêm người dùng và tạo hợp đồng thành công.");
    }
}
