package com.mpbhms.backend;

import com.mpbhms.backend.controller.RoomController;
import com.mpbhms.backend.dto.AddRoomDTO;
import com.mpbhms.backend.dto.ResultPaginationDTO;
import com.mpbhms.backend.entity.RoomEntity;
import com.mpbhms.backend.service.RoomService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Arrays;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class RoomControllerTest {

    @Mock
    private RoomService roomService;

    @InjectMocks
    private RoomController roomController;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void addRoom_ShouldCreateNewRoom() {
        // Arrange
        AddRoomDTO request = new AddRoomDTO();
        request.setRoomNumber("101");
        request.setArea(new BigDecimal("30.5"));
        request.setPricePerMonth(new BigDecimal("1000.00"));
        request.setRoomStatus("Available");
        request.setNumberOfBedrooms(2);
        request.setNumberOfBathrooms(1);
        request.setDescription("A beautiful room");
        request.setImageUrls(Arrays.asList("image1.jpg", "image2.jpg"));

        RoomEntity expectedRoom = new RoomEntity();
        expectedRoom.setId(1L);
        expectedRoom.setRoomNumber(request.getRoomNumber());
        expectedRoom.setArea(request.getArea());
        expectedRoom.setPricePerMonth(request.getPricePerMonth());
        expectedRoom.setRoomStatus(RoomEntity.RoomStatus.Available);
        expectedRoom.setNumberOfBedrooms(request.getNumberOfBedrooms());
        expectedRoom.setNumberOfBathrooms(request.getNumberOfBathrooms());
        expectedRoom.setDescription(request.getDescription());
        expectedRoom.setIsActive(true);

        when(roomService.addRoom(any(AddRoomDTO.class))).thenReturn(expectedRoom);

        // Act
        ResponseEntity<RoomEntity> response = roomController.addRoom(request);

        // Assert
        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(expectedRoom.getId(), response.getBody().getId());
        assertEquals(expectedRoom.getRoomNumber(), response.getBody().getRoomNumber());
        verify(roomService).addRoom(request);
    }

    @Test
    void getAllRooms_ShouldReturnPaginatedResult() {
        // Arrange
        Specification<RoomEntity> spec = mock(Specification.class);
        Pageable pageable = PageRequest.of(0, 10);
        ResultPaginationDTO expectedResult = new ResultPaginationDTO();

        when(roomService.getAllRooms(any(), any())).thenReturn(expectedResult);

        // Act
        ResponseEntity<ResultPaginationDTO> response = roomController.getAllRooms(spec, pageable);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(expectedResult, response.getBody());
        verify(roomService).getAllRooms(spec, pageable);
    }

    @Test
    void updateRoom_ShouldUpdateExistingRoom() {
        // Arrange
        Long roomId = 1L;
        AddRoomDTO request = new AddRoomDTO();
        request.setRoomNumber("102");
        request.setArea(new BigDecimal("40.5"));
        request.setPricePerMonth(new BigDecimal("1200.00"));
        request.setRoomStatus("Available");
        request.setNumberOfBedrooms(2);
        request.setNumberOfBathrooms(1);
        request.setDescription("Updated room description");

        RoomEntity updatedRoom = new RoomEntity();
        updatedRoom.setId(roomId);
        updatedRoom.setRoomNumber(request.getRoomNumber());
        updatedRoom.setArea(request.getArea());
        updatedRoom.setPricePerMonth(request.getPricePerMonth());
        updatedRoom.setRoomStatus(RoomEntity.RoomStatus.Available);
        updatedRoom.setNumberOfBedrooms(request.getNumberOfBedrooms());
        updatedRoom.setNumberOfBathrooms(request.getNumberOfBathrooms());
        updatedRoom.setDescription(request.getDescription());
        updatedRoom.setIsActive(true);

        when(roomService.updateRoom(eq(roomId), any(AddRoomDTO.class))).thenReturn(updatedRoom);

        // Act
        ResponseEntity<RoomEntity> response = roomController.updateRoom(roomId, request);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(updatedRoom.getId(), response.getBody().getId());
        assertEquals(updatedRoom.getRoomNumber(), response.getBody().getRoomNumber());
        assertEquals(updatedRoom.getArea(), response.getBody().getArea());
        verify(roomService).updateRoom(roomId, request);
    }

    @Test
    void deleteRoom_ShouldDeleteExistingRoom() {
        // Arrange
        Long roomId = 1L;
        doNothing().when(roomService).deleteRoom(roomId);

        // Act
        ResponseEntity<Void> response = roomController.deleteRoom(roomId);

        // Assert
        assertEquals(HttpStatus.NO_CONTENT, response.getStatusCode());
        verify(roomService).deleteRoom(roomId);
    }

    @Test
    void addRoom_WithInvalidData_ShouldHandleServiceException() {
        // Arrange
        AddRoomDTO request = new AddRoomDTO();
        when(roomService.addRoom(any(AddRoomDTO.class)))
                .thenThrow(new IllegalArgumentException("Invalid room data"));

        // Act & Assert
        assertThrows(IllegalArgumentException.class, () -> roomController.addRoom(request));
        verify(roomService).addRoom(request);
    }

    @Test
    void updateRoom_WithNonExistentId_ShouldHandleServiceException() {
        // Arrange
        Long nonExistentId = 999L;
        AddRoomDTO request = new AddRoomDTO();
        when(roomService.updateRoom(eq(nonExistentId), any(AddRoomDTO.class)))
                .thenThrow(new IllegalArgumentException("Room not found"));

        // Act & Assert
        assertThrows(IllegalArgumentException.class, () -> roomController.updateRoom(nonExistentId, request));
        verify(roomService).updateRoom(eq(nonExistentId), any(AddRoomDTO.class));
    }

    @Test
    void deleteRoom_WithNonExistentId_ShouldHandleServiceException() {
        // Arrange
        Long nonExistentId = 999L;
        doThrow(new IllegalArgumentException("Room not found"))
                .when(roomService).deleteRoom(nonExistentId);

        // Act & Assert
        assertThrows(IllegalArgumentException.class, () -> roomController.deleteRoom(nonExistentId));
        verify(roomService).deleteRoom(nonExistentId);
    }
}