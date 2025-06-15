package com.mpbhms.backend.controller;

import com.mpbhms.backend.dto.AddRoomDTO;
import com.mpbhms.backend.dto.ResultPaginationDTO;
import com.mpbhms.backend.entity.RoomEntity;
import com.mpbhms.backend.service.ElectricOcrService;
import com.mpbhms.backend.service.RoomService;
import com.turkraft.springfilter.boot.Filter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/mpbhms/rooms")
public class RoomController {
    @Autowired
    private RoomService roomService;
    @Autowired
    private ElectricOcrService electricOcrService;
    @PostMapping()
    public ResponseEntity<RoomEntity> addRoom(@RequestBody AddRoomDTO request) {
        RoomEntity savedRoom = roomService.addRoom(request);
        return new ResponseEntity<>(savedRoom, HttpStatus.CREATED);
    }
    @GetMapping()
    public ResponseEntity<ResultPaginationDTO> getAllRooms(
            @Filter Specification<RoomEntity> spec, Pageable pageable) {
        ResultPaginationDTO response = roomService.getAllRooms(spec, pageable);
        return ResponseEntity.ok(response);
    }
    @PutMapping("/{id}")
    public ResponseEntity<RoomEntity> updateRoom(
            @PathVariable Long id,
            @RequestBody AddRoomDTO request) {
        RoomEntity updatedRoom = roomService.updateRoom(id, request);
        return ResponseEntity.ok(updatedRoom);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteRoom(@PathVariable Long id) {
        roomService.deleteRoom(id);
        return ResponseEntity.noContent().build();
    }
    @PostMapping("/electric")
    public ResponseEntity<String> ocrElectricMeter(@RequestParam("file") MultipartFile file) {
        try {
            String result = electricOcrService.extractTextFromImage(file);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("OCR failed: " + e.getMessage());
        }
    }
}
