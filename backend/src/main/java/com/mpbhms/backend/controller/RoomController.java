package com.mpbhms.backend.controller;

import com.mpbhms.backend.dto.AddRoomDTO;
import com.mpbhms.backend.dto.ResultPaginationDTO;
import com.mpbhms.backend.dto.RoomDTO;
import com.mpbhms.backend.entity.Room;
import com.mpbhms.backend.response.AddRoomDTOResponse;
import com.mpbhms.backend.service.ElectricMeterDetectionService;
import com.mpbhms.backend.service.RoomService;
import com.turkraft.springfilter.boot.Filter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/mpbhms/rooms")
public class RoomController {
    @Autowired
    private RoomService roomService;
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<AddRoomDTOResponse> addRoom(
            @RequestPart("room") String roomJson,
            @RequestPart(name = "images", required = false) MultipartFile[] images) throws com.fasterxml.jackson.core.JsonProcessingException {
        com.fasterxml.jackson.databind.ObjectMapper objectMapper = new com.fasterxml.jackson.databind.ObjectMapper();
        AddRoomDTO request = objectMapper.readValue(roomJson, AddRoomDTO.class);
        Room savedRoom = roomService.addRoom(request, images);
        AddRoomDTOResponse response = new AddRoomDTOResponse();
        response.setId(savedRoom.getId());
        response.setRoomNumber(savedRoom.getRoomNumber());
        response.setArea(savedRoom.getArea());
        response.setPricePerMonth(savedRoom.getPricePerMonth());
        response.setRoomStatus(savedRoom.getRoomStatus() != null ? savedRoom.getRoomStatus().name() : null);
        response.setNumberOfBedrooms(savedRoom.getNumberOfBedrooms());
        response.setNumberOfBathrooms(savedRoom.getNumberOfBathrooms());
        response.setDescription(savedRoom.getDescription());
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }
    @GetMapping()
    public ResponseEntity<ResultPaginationDTO> getAllRooms(
            @Filter Specification<Room> spec, Pageable pageable) {
        ResultPaginationDTO response = roomService.getAllRooms(spec, pageable);
        return ResponseEntity.ok(response);
    }
    @PostMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<AddRoomDTOResponse> updateRoom(
            @PathVariable Long id,
            @RequestPart("room") String roomJson,
            @RequestPart(name = "keepImageIds", required = false) List<Long> keepImageIds,
            @RequestPart(name = "images", required = false) MultipartFile[] images
    ) throws com.fasterxml.jackson.core.JsonProcessingException {
        com.fasterxml.jackson.databind.ObjectMapper objectMapper = new com.fasterxml.jackson.databind.ObjectMapper();
        AddRoomDTO request = objectMapper.readValue(roomJson, AddRoomDTO.class);
        Room updatedRoom = roomService.updateRoom(id, request, keepImageIds, images);
        AddRoomDTOResponse response = new AddRoomDTOResponse();
        response.setId(updatedRoom.getId());
        response.setRoomNumber(updatedRoom.getRoomNumber());
        response.setArea(updatedRoom.getArea());
        response.setPricePerMonth(updatedRoom.getPricePerMonth());
        response.setRoomStatus(updatedRoom.getRoomStatus() != null ? updatedRoom.getRoomStatus().name() : null);
        response.setNumberOfBedrooms(updatedRoom.getNumberOfBedrooms());
        response.setNumberOfBathrooms(updatedRoom.getNumberOfBathrooms());
        response.setDescription(updatedRoom.getDescription());
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteRoom(@PathVariable Long id) {
        roomService.deleteRoom(id);
        return ResponseEntity.noContent().build();
    }
}
