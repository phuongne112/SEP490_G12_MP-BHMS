package com.mpbhms.backend.controller;

import com.mpbhms.backend.dto.AddRoomDTO;
import com.mpbhms.backend.dto.ResultPaginationDTO;
import com.mpbhms.backend.entity.Room;
import com.mpbhms.backend.service.ElectricMeterDetectionService;
import com.mpbhms.backend.service.RoomService;
import com.turkraft.springfilter.boot.Filter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/mpbhms/rooms")
public class RoomController {
    @Autowired
    private RoomService roomService;
    @PostMapping()
    public ResponseEntity<Room> addRoom(@RequestBody AddRoomDTO request) {
        Room savedRoom = roomService.addRoom(request);
        return new ResponseEntity<>(savedRoom, HttpStatus.CREATED);
    }
    @GetMapping()
    public ResponseEntity<ResultPaginationDTO> getAllRooms(
            @Filter Specification<Room> spec, Pageable pageable) {
        ResultPaginationDTO response = roomService.getAllRooms(spec, pageable);
        return ResponseEntity.ok(response);
    }
    @PutMapping("/{id}")
    public ResponseEntity<Room> updateRoom(
            @PathVariable Long id,
            @RequestBody AddRoomDTO request) {
        Room updatedRoom = roomService.updateRoom(id, request);
        return ResponseEntity.ok(updatedRoom);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteRoom(@PathVariable Long id) {
        roomService.deleteRoom(id);
        return ResponseEntity.noContent().build();
    }
}
