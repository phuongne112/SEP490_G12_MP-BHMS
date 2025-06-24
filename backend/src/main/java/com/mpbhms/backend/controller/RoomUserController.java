package com.mpbhms.backend.controller;

import com.mpbhms.backend.dto.AddUsersToRoomRequest;
import com.mpbhms.backend.service.RoomUserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.PathVariable;

@RestController
@RequestMapping("/mpbhms/room-users")
@RequiredArgsConstructor
public class RoomUserController {

    private final RoomUserService roomUserService;

    @PostMapping("/add-many")
    public ResponseEntity<?> addUsersToRoom(@RequestBody AddUsersToRoomRequest request) {
        try {
            roomUserService.addUsersToRoom(request);
            return ResponseEntity.ok("Đã thêm người dùng và tạo hợp đồng thành công.");
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Có lỗi xảy ra: " + e.getMessage());
        }
    }

    @PostMapping("/leave/{roomUserId}")
    public ResponseEntity<?> leaveRoom(@PathVariable Long roomUserId) {
        roomUserService.leaveRoom(roomUserId);
        return ResponseEntity.ok("Đã rời phòng thành công.");
    }
}
