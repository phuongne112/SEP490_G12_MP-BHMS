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
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.validation.FieldError;
import java.util.HashMap;
import java.util.Map;

import java.util.List;

import com.mpbhms.backend.entity.ApiResponse;

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
        // Validate manually (since @Valid doesn't work with @RequestPart String)
        org.springframework.validation.BeanPropertyBindingResult errors = new org.springframework.validation.BeanPropertyBindingResult(request, "addRoomDTO");
        org.springframework.validation.Validator validator = new org.springframework.validation.beanvalidation.LocalValidatorFactoryBean();
        validator.validate(request, errors);
        if (errors.hasErrors()) {
            Map<String, String> errorMap = new HashMap<>();
            for (FieldError fieldError : errors.getFieldErrors()) {
                errorMap.put(fieldError.getField(), fieldError.getDefaultMessage());
            }
            throw new com.mpbhms.backend.exception.ValidationException("Validation failed", errorMap);
        }
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
        response.setMaxOccupants(savedRoom.getMaxOccupants());
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
        response.setMaxOccupants(updatedRoom.getMaxOccupants());
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteRoom(@PathVariable Long id) {
        roomService.deleteRoom(id);
        return ResponseEntity.noContent().build();
    }

    // Xử lý lỗi validation toàn cục
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, String>> handleValidationExceptions(MethodArgumentNotValidException ex) {
        Map<String, String> errors = new HashMap<>();
        ex.getBindingResult().getAllErrors().forEach((error) -> {
            String fieldName = ((FieldError) error).getField();
            String errorMessage = error.getDefaultMessage();
            errors.put(fieldName, errorMessage);
        });
        return ResponseEntity.badRequest().body(errors);
    }
}
