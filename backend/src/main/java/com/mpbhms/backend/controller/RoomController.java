package com.mpbhms.backend.controller;

import com.mpbhms.backend.dto.AddRoomDTO;
import com.mpbhms.backend.dto.ResultPaginationDTO;
import com.mpbhms.backend.dto.RoomDTO;
import com.mpbhms.backend.entity.Room;
import com.mpbhms.backend.response.AddRoomDTOResponse;
import com.mpbhms.backend.dto.UpdateRoomStatusDTO;
import com.mpbhms.backend.service.RoomService;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import com.mpbhms.backend.entity.ApiResponse;
import com.mpbhms.backend.exception.BusinessException;
import com.mpbhms.backend.repository.ServiceReadingRepository;

import java.math.BigDecimal;
import java.util.*;

@RestController
@RequestMapping("/mpbhms/rooms")
public class RoomController {

    @Autowired
    private RoomService roomService;

    @Autowired
    private ServiceReadingRepository serviceReadingRepository;

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> addRoom(
            @RequestPart("room") String roomJson,
            @RequestPart(name = "images", required = false) MultipartFile[] images
    ) throws com.fasterxml.jackson.core.JsonProcessingException {
        ObjectMapper objectMapper = new ObjectMapper();
        AddRoomDTO request = objectMapper.readValue(roomJson, AddRoomDTO.class);

        var errors = new org.springframework.validation.BeanPropertyBindingResult(request, "addRoomDTO");
        var validatorFactory = new org.springframework.validation.beanvalidation.LocalValidatorFactoryBean();
        validatorFactory.afterPropertiesSet();
        validatorFactory.validate(request, errors);
        if (errors.hasErrors()) {
            Map<String, String> errorMap = new HashMap<>();
            for (FieldError fieldError : errors.getFieldErrors()) {
                errorMap.put(fieldError.getField(), fieldError.getDefaultMessage());
            }
            throw new com.mpbhms.backend.exception.ValidationException("Dữ liệu không hợp lệ", errorMap);
        }

        Room result = roomService.addRoom(request, images);
        if (Boolean.TRUE.equals(result.getDeleted())) {
            Map<String, Object> resp = new HashMap<>();
            resp.put("message", "Phòng này đã từng tồn tại và đang bị xoá. Bạn có muốn khôi phục lại không?");
            resp.put("roomId", result.getId());
            resp.put("roomNumber", result.getRoomNumber());
            return ResponseEntity.status(HttpStatus.CONFLICT).body(resp);
        }

        AddRoomDTOResponse response = mapToResponse(result);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> updateRoom(
            @PathVariable Long id,
            @RequestPart("room") String roomJson,
            @RequestPart(name = "keepImageIds", required = false) String keepImageIdsJson,
            @RequestPart(name = "images", required = false) MultipartFile[] images
    ) throws com.fasterxml.jackson.core.JsonProcessingException {
        ObjectMapper objectMapper = new ObjectMapper();
        AddRoomDTO request = objectMapper.readValue(roomJson, AddRoomDTO.class);

        var errors = new org.springframework.validation.BeanPropertyBindingResult(request, "addRoomDTO");
        var validatorFactory = new org.springframework.validation.beanvalidation.LocalValidatorFactoryBean();
        validatorFactory.afterPropertiesSet();
        validatorFactory.validate(request, errors);
        if (errors.hasErrors()) {
            Map<String, String> errorMap = new HashMap<>();
            for (FieldError fieldError : errors.getFieldErrors()) {
                errorMap.put(fieldError.getField(), fieldError.getDefaultMessage());
            }
            throw new com.mpbhms.backend.exception.ValidationException("Dữ liệu không hợp lệ", errorMap);
        }

        List<Long> keepImageIdLongs = null;
        if (keepImageIdsJson != null && !keepImageIdsJson.isEmpty()) {
            keepImageIdLongs = objectMapper.readValue(keepImageIdsJson,
                    objectMapper.getTypeFactory().constructCollectionType(List.class, Long.class));
        }

        Room updatedRoom;
        try {
            updatedRoom = roomService.updateRoom(id, request, keepImageIdLongs, images);
        } catch (com.mpbhms.backend.exception.ResourceNotFoundException ex) {
            Map<String, Object> body = new HashMap<>();
            body.put("errorCode", "RESOURCE_NOT_FOUND");
            body.put("message", ex.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(body);
        }

        AddRoomDTOResponse response = mapToResponse(updatedRoom);
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<Void> updateRoomStatus(@PathVariable Long id, @Valid @RequestBody UpdateRoomStatusDTO request) {
        roomService.updateRoomStatus(id, request.getRoomStatus());
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/{id}/active")
    public ResponseEntity<Void> toggleActiveStatus(@PathVariable Long id) {
        roomService.toggleActiveStatus(id);
        return ResponseEntity.ok().build();
    }

    @GetMapping
    public ResponseEntity<ResultPaginationDTO> getAllRooms(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Pageable pageable = Pageable.ofSize(size).withPage(page);
        ResultPaginationDTO response = roomService.getAllRooms(null, pageable);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/all")
    public ResponseEntity<List<RoomDTO>> getAllRoomsNoPaging() {
        List<Room> rooms = roomService.getAllRoomsNoPaging();
        List<RoomDTO> dtos = roomService.convertToRoomDTOList(rooms);
        return ResponseEntity.ok(dtos);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteRoom(@PathVariable Long id) {
        roomService.deleteRoom(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/restore")
    public ResponseEntity<Void> restoreRoom(@PathVariable Long id) {
        roomService.restoreRoom(id);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/with-renter")
    public ResponseEntity<ResultPaginationDTO> getAllRoomsWithRenter(Pageable pageable) {
        ResultPaginationDTO response = roomService.getAllRoomsWithRenter(pageable);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/deleted")
    public ResponseEntity<ResultPaginationDTO> getDeletedRooms(Pageable pageable) {
        ResultPaginationDTO response = roomService.getDeletedRooms(pageable);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/with-electric-readings")
    public ResponseEntity<List<RoomDTO>> getRoomsWithElectricReadings() {
        List<Long> roomIds = serviceReadingRepository.findDistinctRoomIds();
        List<Room> rooms = roomService.getRoomsByIds(roomIds);
        List<RoomDTO> dtos = roomService.convertToRoomDTOList(rooms);
        return ResponseEntity.ok(dtos);
    }

    @GetMapping("/{id}")
    public ResponseEntity<RoomDTO> getRoomById(@PathVariable Long id) {
        Room room = roomService.getRoomById(id);
        RoomDTO dto = roomService.convertToRoomDTO(room);
        return ResponseEntity.ok(dto);
    }

    @PostMapping("/{roomId}/add-service")
    public ResponseEntity<Map<String, Object>> addServiceToRoom(@PathVariable Long roomId, @RequestBody Map<String, Object> body) {
        Long serviceId = ((Number) body.get("serviceId")).longValue();
        BigDecimal initialReading = null;
        if (body.containsKey("initialReading") && body.get("initialReading") != null) {
            try {
                initialReading = new BigDecimal(body.get("initialReading").toString());
            } catch (Exception ignored) {}
        }
        boolean created = roomService.addServiceToRoom(roomId, serviceId, initialReading);
        Map<String, Object> resp = new HashMap<>();
        resp.put("serviceReadingCreated", created);
        return ResponseEntity.ok(resp);
    }

    @DeleteMapping("/{roomId}/remove-service/{serviceId}")
    public ResponseEntity<?> removeServiceFromRoom(@PathVariable Long roomId, @PathVariable Long serviceId) {
        boolean removed = roomService.removeServiceFromRoom(roomId, serviceId);
        if (removed) {
            return ResponseEntity.ok().body("Đã xóa dịch vụ khỏi phòng thành công.");
        } else {
            return ResponseEntity.badRequest().body("Không thể xóa dịch vụ khỏi phòng (có thể dịch vụ không tồn tại hoặc đã phát sinh hóa đơn).");
        }
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, String>> handleValidationExceptions(MethodArgumentNotValidException ex) {
        Map<String, String> errors = new HashMap<>();
        ex.getBindingResult().getAllErrors().forEach((error) -> {
            String fieldName = ((FieldError) error).getField();
            String errorMessage = error.getDefaultMessage();
            errors.put(fieldName, errorMessage);
        });
        errors.put("_message", "Dữ liệu gửi lên không hợp lệ. Vui lòng kiểm tra lại các trường thông tin!");
        return ResponseEntity.badRequest().body(errors);
    }

    @ExceptionHandler(com.mpbhms.backend.exception.ValidationException.class)
    public ResponseEntity<Map<String, Object>> handleValidationException(com.mpbhms.backend.exception.ValidationException ex) {
        Map<String, Object> errorBody = new HashMap<>();
        errorBody.put("errorCode", "VALIDATION_ERROR");
        errorBody.put("message", ex.getMessage());
        errorBody.put("errors", ex.getErrors());
        return ResponseEntity.badRequest().body(errorBody);
    }

    @ExceptionHandler(com.mpbhms.backend.exception.ResourceNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleResourceNotFound(com.mpbhms.backend.exception.ResourceNotFoundException ex) {
        Map<String, Object> body = new HashMap<>();
        body.put("errorCode", "RESOURCE_NOT_FOUND");
        body.put("message", ex.getMessage());
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(body);
    }

    // Helper method
    private AddRoomDTOResponse mapToResponse(Room room) {
        AddRoomDTOResponse response = new AddRoomDTOResponse();
        response.setId(room.getId());
        response.setRoomNumber(room.getRoomNumber());
        response.setArea(room.getArea());
        response.setPricePerMonth(room.getPricePerMonth());
        response.setRoomStatus(room.getRoomStatus() != null ? room.getRoomStatus().name() : null);
        response.setNumberOfBedrooms(room.getNumberOfBedrooms());
        response.setNumberOfBathrooms(room.getNumberOfBathrooms());
        response.setDescription(room.getDescription());
        response.setMaxOccupants(room.getMaxOccupants());
        response.setBuilding(room.getBuilding());
        return response;
    }
}
