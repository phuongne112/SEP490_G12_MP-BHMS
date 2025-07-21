package com.mpbhms.backend.controller;

import com.mpbhms.backend.dto.AddRoomDTO;
import com.mpbhms.backend.dto.ResultPaginationDTO;
import com.mpbhms.backend.dto.RoomDTO;
import com.mpbhms.backend.entity.Room;
import com.mpbhms.backend.response.AddRoomDTOResponse;
import com.mpbhms.backend.dto.UpdateRoomStatusDTO;
import com.mpbhms.backend.service.ElectricMeterDetectionService;
import com.mpbhms.backend.service.RoomService;
import com.turkraft.springfilter.boot.Filter;
import jakarta.validation.Valid;
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
import com.mpbhms.backend.exception.BusinessException;
import com.mpbhms.backend.repository.ServiceReadingRepository;

@RestController
@RequestMapping("/mpbhms/rooms")
public class RoomController {
    @Autowired
    private RoomService roomService;
    @Autowired
    private com.mpbhms.backend.repository.ServiceReadingRepository serviceReadingRepository;
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> addRoom(
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
            throw new com.mpbhms.backend.exception.ValidationException("Dữ liệu không hợp lệ", errorMap);
        }
        Room result = roomService.addRoom(request, images);
        if (result.getDeleted() != null && result.getDeleted()) {
            // Nếu phòng đã bị xóa mềm, trả về thông báo và thông tin phòng
            Map<String, Object> resp = new HashMap<>();
            resp.put("message", "Phòng này đã từng tồn tại và đang bị xoá. Bạn có muốn khôi phục lại không?");
            resp.put("roomId", result.getId());
            resp.put("roomNumber", result.getRoomNumber());
            return ResponseEntity.status(HttpStatus.CONFLICT).body(resp);
        }
        // Nếu tạo mới thành công, trả về thông tin phòng
        AddRoomDTOResponse response = new AddRoomDTOResponse();
        response.setId(result.getId());
        response.setRoomNumber(result.getRoomNumber());
        response.setArea(result.getArea());
        response.setPricePerMonth(result.getPricePerMonth());
        response.setRoomStatus(result.getRoomStatus() != null ? result.getRoomStatus().name() : null);
        response.setNumberOfBedrooms(result.getNumberOfBedrooms());
        response.setNumberOfBathrooms(result.getNumberOfBathrooms());
        response.setDescription(result.getDescription());
        response.setMaxOccupants(result.getMaxOccupants());
        response.setBuilding(result.getBuilding());
        return new ResponseEntity<>(response, HttpStatus.CREATED);
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
    @GetMapping()
    public ResponseEntity<ResultPaginationDTO> getAllRooms(
            @Filter Specification<Room> spec, Pageable pageable) {
        ResultPaginationDTO response = roomService.getAllRooms(spec, pageable);
        return ResponseEntity.ok(response);
    }
    @GetMapping("/all")
    public ResponseEntity<List<RoomDTO>> getAllRoomsNoPaging() {
        List<Room> rooms = roomService.getAllRoomsNoPaging();
        List<RoomDTO> dtos = roomService.convertToRoomDTOList(rooms);
        return ResponseEntity.ok(dtos);
    }
    @PostMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<AddRoomDTOResponse> updateRoom(
            @PathVariable Long id,
            @RequestPart("room") String roomJson,
            @RequestPart(name = "keepImageIds", required = false) String keepImageIdsJson,
            @RequestPart(name = "images", required = false) MultipartFile[] images
    ) throws com.fasterxml.jackson.core.JsonProcessingException {
        com.fasterxml.jackson.databind.ObjectMapper objectMapper = new com.fasterxml.jackson.databind.ObjectMapper();
        AddRoomDTO request = objectMapper.readValue(roomJson, AddRoomDTO.class);
        // Parse keepImageIdsJson thành List<Long>
        List<Long> keepImageIdLongs = null;
        if (keepImageIdsJson != null && !keepImageIdsJson.isEmpty()) {
            keepImageIdLongs = objectMapper.readValue(keepImageIdsJson, objectMapper.getTypeFactory().constructCollectionType(List.class, Long.class));
        }
        Room updatedRoom = roomService.updateRoom(id, request, keepImageIdLongs, images);
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
        response.setBuilding(updatedRoom.getBuilding());
        return ResponseEntity.ok(response);
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
        java.math.BigDecimal initialReading = null;
        if (body.containsKey("initialReading") && body.get("initialReading") != null) {
            try {
                initialReading = new java.math.BigDecimal(body.get("initialReading").toString());
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

    @PatchMapping("/{roomId}/deactivate-service/{serviceId}")
    public ResponseEntity<?> deactivateService(
        @PathVariable Long roomId,
        @PathVariable Long serviceId
    ) {
        roomService.deactivateServiceForRoom(roomId, serviceId);
        return ResponseEntity.ok("Đã ngừng sử dụng dịch vụ cho phòng này.");
    }

    @PatchMapping("/{id}/scan-folder")
    public ResponseEntity<?> updateScanFolder(@PathVariable Long id, @RequestBody Map<String, String> body) {
        String folder = body.get("scanFolder");
        roomService.updateScanFolder(id, folder);
        return ResponseEntity.ok().build();
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
        // Việt hóa thông báo lỗi tổng quát
        errors.put("_message", "Dữ liệu gửi lên không hợp lệ. Vui lòng kiểm tra lại các trường thông tin!");
        return ResponseEntity.badRequest().body(errors);
    }
}
