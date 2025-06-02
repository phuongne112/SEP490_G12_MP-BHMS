package com.mpbhms.backend.controller;

import com.mpbhms.backend.dto.AddRoomDTO;
import com.mpbhms.backend.dto.ResultPaginationDTO;
import com.mpbhms.backend.entity.RoomEntity;
import com.mpbhms.backend.service.RoomService;
import com.turkraft.springfilter.boot.Filter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/mpbhms/rooms")
public class RoomController {
    @Autowired
    private RoomService roomService;

    @PostMapping()
    public ResponseEntity<RoomEntity> addRoom(@RequestBody AddRoomDTO request) {
        RoomEntity savedRoom = roomService.addRoom(request);
        return new ResponseEntity<>(savedRoom, HttpStatus.CREATED);
    }
    @GetMapping
    public ResponseEntity<ResultPaginationDTO> getAllRooms(
//            @RequestParam("current") Optional<String> currentOptional,
//            @RequestParam("pageSize") Optional<String> pageSizeOptional) {
//        String sCurrent = currentOptional.isPresent() ? currentOptional.get() : "";;
//        String sPageSize = pageSizeOptional.isPresent() ? pageSizeOptional.get() : "";
//        int current = Integer.parseInt(sCurrent) - 1;
//        int pageSize = Integer.parseInt(sPageSize);
//        Pageable pageable = PageRequest.of(current, pageSize);
//        ResultPaginationDTO response = roomService.getAllRooms(pageable);
//        return ResponseEntity.ok(response);

            @Filter Specification<RoomEntity> spec, Pageable pageable) {
        ResultPaginationDTO response = roomService.getAllRooms(spec, pageable);
        return ResponseEntity.ok(response);
    }
}
