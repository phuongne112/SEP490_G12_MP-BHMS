package com.mpbhms.backend;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mpbhms.backend.controller.RoomController;
import com.mpbhms.backend.dto.*;
import com.mpbhms.backend.entity.Room;
import com.mpbhms.backend.enums.RoomStatus;
import com.mpbhms.backend.exception.*;
import com.mpbhms.backend.response.AddRoomDTOResponse;
import com.mpbhms.backend.service.RoomService;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.MethodParameter;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.data.web.PageableHandlerMethodArgumentResolver;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.*;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.test.web.servlet.result.MockMvcResultHandlers.print;

import java.io.ByteArrayOutputStream;
import java.io.PrintStream;

@ExtendWith(MockitoExtension.class)
public class RoomControllerTest {

        private MockMvc mockMvc;

        @Mock
        private RoomService roomService;

        private ObjectMapper objectMapper;

        private final PrintStream originalErr = System.err;
        private ByteArrayOutputStream errContent;

        @BeforeEach
        void setUp() {
                Mockito.reset(roomService);
                objectMapper = new ObjectMapper();
                objectMapper.findAndRegisterModules();

                RoomController controller = new RoomController();
                ReflectionTestUtils.setField(controller, "roomService", roomService);

                HandlerMethodArgumentResolver mockFilterResolver = new HandlerMethodArgumentResolver() {
                        @Override
                        public boolean supportsParameter(MethodParameter parameter) {
                                // Chỉ trả về true nếu là Specification
                                return Specification.class.isAssignableFrom(parameter.getParameterType());
                        }

                        @Override
                        public Object resolveArgument(MethodParameter parameter,
                                        ModelAndViewContainer mavContainer,
                                        NativeWebRequest webRequest,
                                        org.springframework.web.bind.support.WebDataBinderFactory binderFactory) {
                                return (Specification<Room>) (root, query, cb) -> cb.conjunction();
                        }
                };

                PageableHandlerMethodArgumentResolver pageableResolver = new PageableHandlerMethodArgumentResolver();

                mockMvc = MockMvcBuilders
                                .standaloneSetup(controller)
                                .setControllerAdvice(new GlobalExceptionHandler())
                                .setCustomArgumentResolvers(mockFilterResolver, pageableResolver)
                                .build();

                errContent = new ByteArrayOutputStream();
                System.setErr(new PrintStream(errContent));
        }

        // ==================== TEST ADD ROOM ====================

        @Test
        public void testAddRoom_Success() throws Exception {
                // Arrange
                AddRoomDTO requestDTO = createMockAddRoomDTO();
                Room mockRoom = createMockRoom();
                mockRoom.setDeleted(false);

                when(roomService.addRoom(any(AddRoomDTO.class), any(MultipartFile[].class)))
                                .thenReturn(mockRoom);

                // Act & Assert
                mockMvc.perform(multipart("/mpbhms/rooms")
                                .file(new MockMultipartFile("room", "", "application/json",
                                                objectMapper.writeValueAsBytes(requestDTO)))
                                .file(new MockMultipartFile("images", "test.jpg", "image/jpeg",
                                                "test image".getBytes())))
                                .andExpect(status().isCreated())
                                .andExpect(jsonPath("$.id").value(mockRoom.getId()))
                                .andExpect(jsonPath("$.roomNumber").value(mockRoom.getRoomNumber()));
        }

        @Test
        public void testAddRoom_SoftDeletedRoom() throws Exception {
                // Arrange
                AddRoomDTO requestDTO = createMockAddRoomDTO();
                Room mockRoom = createMockRoom();
                mockRoom.setDeleted(true);

                when(roomService.addRoom(any(AddRoomDTO.class), isNull()))
                                .thenReturn(mockRoom);

                // Act & Assert
                mockMvc.perform(multipart("/mpbhms/rooms")
                                .file(new MockMultipartFile("room", "", "application/json",
                                                objectMapper.writeValueAsBytes(requestDTO))))
                                .andDo(print())
                                .andExpect(status().isConflict())
                                .andExpect(jsonPath("$.message")
                                                .value("Phòng này đã từng tồn tại và đang bị xoá. Bạn có muốn khôi phục lại không?"))
                                .andExpect(jsonPath("$.roomId").value(mockRoom.getId()));
        }

        @Test
        public void testAddRoom_InvalidJson() throws Exception {
                // Act & Assert
                mockMvc.perform(multipart("/mpbhms/rooms")
                                .file(new MockMultipartFile("room", "", "application/json", "invalid json".getBytes())))
                                .andExpect(status().isInternalServerError());
        }

        @Test
        public void testAddRoom_ValidationError() throws Exception {
                // Arrange
                AddRoomDTO requestDTO = new AddRoomDTO();
                // Không set required fields

                // Redirect System.err để ẩn log lỗi
                // java.io.PrintStream originalErr = System.err;
                // System.setErr(new java.io.PrintStream(new java.io.ByteArrayOutputStream()));
                try {
                        // Act & Assert
                        mockMvc.perform(multipart("/mpbhms/rooms")
                                        .file(new MockMultipartFile("room", "", "application/json",
                                                        objectMapper.writeValueAsBytes(requestDTO))))
                                        .andExpect(status().isInternalServerError());
                } finally {
                        // System.setErr(originalErr);
                }
        }

        @Test
        public void testAddRoom_WithoutImages() throws Exception {
                // Arrange
                AddRoomDTO requestDTO = createMockAddRoomDTO();
                Room mockRoom = createMockRoom();
                mockRoom.setDeleted(false);

                when(roomService.addRoom(any(AddRoomDTO.class), eq(null)))
                                .thenReturn(mockRoom);

                // Act & Assert
                mockMvc.perform(multipart("/mpbhms/rooms")
                                .file(new MockMultipartFile("room", "", "application/json",
                                                objectMapper.writeValueAsBytes(requestDTO))))
                                .andExpect(status().isCreated())
                                .andExpect(jsonPath("$.id").value(mockRoom.getId()));
        }

        @Test
        public void testAddRoom_ServiceException() throws Exception {
                // Arrange
                AddRoomDTO requestDTO = createMockAddRoomDTO();

                when(roomService.addRoom(any(AddRoomDTO.class), any(MultipartFile[].class)))
                                .thenThrow(new BusinessException("Phòng đã tồn tại"));

                // Act & Assert
                mockMvc.perform(multipart("/mpbhms/rooms")
                                .file(new MockMultipartFile("room", "", "application/json",
                                                objectMapper.writeValueAsBytes(requestDTO))))
                                .andExpect(status().isBadRequest());
        }

        // ==================== TEST UPDATE ROOM STATUS ====================

        @Test
        public void testUpdateRoomStatus_Success() throws Exception {
                // Arrange
                Long roomId = 1L;
                UpdateRoomStatusDTO requestDTO = new UpdateRoomStatusDTO();
                requestDTO.setRoomStatus(RoomStatus.Available.name());

                doNothing().when(roomService).updateRoomStatus(roomId, RoomStatus.Available.name());

                // Act & Assert
                mockMvc.perform(patch("/mpbhms/rooms/{id}/status", roomId)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(requestDTO)))
                                .andExpect(status().isOk());
        }

        @Test
        public void testUpdateRoomStatus_InvalidStatus() throws Exception {
                // Arrange
                Long roomId = 1L;
                UpdateRoomStatusDTO requestDTO = new UpdateRoomStatusDTO();
                lenient().doThrow(new IllegalArgumentException("Invalid status"))
                                .when(roomService).updateRoomStatus(eq(1L), eq("INVALID_STATUS"));

                // Act & Assert
                mockMvc.perform(patch("/mpbhms/rooms/{id}/status", roomId)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(requestDTO)))
                                .andExpect(status().isBadRequest());
        }

        @Test
        public void testUpdateRoomStatus_RoomNotFound() throws Exception {
                // Arrange
                Long roomId = 999L;
                UpdateRoomStatusDTO requestDTO = new UpdateRoomStatusDTO();
                requestDTO.setRoomStatus(RoomStatus.Available.name());

                doThrow(new NotFoundException("Không tìm thấy phòng"))
                                .when(roomService).updateRoomStatus(roomId, RoomStatus.Available.name());

                // Act & Assert
                mockMvc.perform(patch("/mpbhms/rooms/{id}/status", roomId)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(requestDTO)))
                                .andExpect(status().isBadRequest());
        }

        // ==================== TEST TOGGLE ACTIVE STATUS ====================

        @Test
        public void testToggleActiveStatus_Success() throws Exception {
                // Arrange
                Long roomId = 1L;
                doNothing().when(roomService).toggleActiveStatus(roomId);

                // Act & Assert
                mockMvc.perform(patch("/mpbhms/rooms/{id}/active", roomId))
                                .andExpect(status().isOk());
        }

        @Test
        public void testToggleActiveStatus_RoomNotFound() throws Exception {
                // Arrange
                Long roomId = 999L;
                doThrow(new NotFoundException("Không tìm thấy phòng"))
                                .when(roomService).toggleActiveStatus(roomId);

                // Act & Assert
                mockMvc.perform(patch("/mpbhms/rooms/{id}/active", roomId))
                                .andExpect(status().isBadRequest());
        }

        @Test
        public void testToggleActiveStatus_InvalidId() throws Exception {
                // Act & Assert
                mockMvc.perform(patch("/mpbhms/rooms/{id}/active", "invalid"))
                                .andExpect(status().isBadRequest());
        }

        // ==================== TEST GET ALL ROOMS ====================

        @Test
        public void testGetAllRooms_Success() throws Exception {
                // Arrange
                RoomDTO roomDTO = new RoomDTO();
                roomDTO.setId(1L);
                roomDTO.setRoomNumber("A101");

                ResultPaginationDTO result = new ResultPaginationDTO();
                result.setResult(Collections.singletonList(roomDTO));

                when(roomService.getAllRooms(any(), any(Pageable.class)))
                                .thenReturn(result);

                // Act & Assert
                mockMvc.perform(get("/mpbhms/rooms")
                                .param("page", "0")
                                .param("size", "10")

                                .contentType(MediaType.APPLICATION_JSON))
                                .andDo(print())
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.result").isArray())
                                .andExpect(jsonPath("$.result.length()").value(1))
                                .andExpect(jsonPath("$.result[0].id").value(1))
                                .andExpect(jsonPath("$.result[0].roomNumber").value("A101"));
        }

        @Test
        public void testGetAllRooms_WithoutFilter() throws Exception {
                ResultPaginationDTO mockResult = createMockResultPaginationDTO();
                when(roomService.getAllRooms(any(), any(Pageable.class))).thenReturn(mockResult);

                mockMvc.perform(get("/mpbhms/rooms")
                                .param("page", "0")
                                .param("size", "10"))
                                .andExpect(status().isOk());
        }

        @Test
        public void testGetAllRooms_InvalidPagination() throws Exception {
                // Act & Assert
                mockMvc.perform(get("/mpbhms/rooms")
                                .param("page", "-1")
                                .param("size", "0"))
                                .andExpect(status().isOk());
        }

        @Test
        public void testGetAllRooms_ServiceException() throws Exception {
                // Arrange
                when(roomService.getAllRooms(any(Specification.class), any(Pageable.class)))
                                .thenThrow(new RuntimeException("Lỗi database"));

                // Act & Assert
                mockMvc.perform(get("/mpbhms/rooms")
                                .param("page", "0")
                                .param("size", "10"))
                                .andExpect(status().isBadRequest());
        }

        // ==================== TEST UPDATE ROOM ====================

        @Test
        public void testUpdateRoom_Success() throws Exception {
                // Arrange
                Long roomId = 1L;
                AddRoomDTO requestDTO = createMockAddRoomDTO();
                Room mockRoom = createMockRoom();

                when(roomService.updateRoom(eq(roomId), any(AddRoomDTO.class), anyList(), any(MultipartFile[].class)))
                                .thenReturn(mockRoom);

                // Serialize DTO
                String jsonRoom = objectMapper.writeValueAsString(requestDTO);
                String keepImageIdsJson = objectMapper.writeValueAsString(Collections.emptyList());

                // Multipart parts
                MockMultipartFile roomPart = new MockMultipartFile("room", "", "application/json", jsonRoom.getBytes());
                MockMultipartFile keepImageIdsPart = new MockMultipartFile("keepImageIds", "", "application/json",
                                keepImageIdsJson.getBytes());
                MockMultipartFile imagePart = new MockMultipartFile("images", "test.jpg", "image/jpeg",
                                "fake image content".getBytes());

                // Act & Assert
                mockMvc.perform(multipart("/mpbhms/rooms/{id}", roomId)
                                .file(roomPart)
                                .file(keepImageIdsPart)
                                .file(imagePart)
                                .contentType(MediaType.MULTIPART_FORM_DATA))
                                .andDo(print()) // 👈 In toàn bộ request/response để debug
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.id").value(mockRoom.getId()))
                                .andExpect(jsonPath("$.roomNumber").value(mockRoom.getRoomNumber()))
                                .andExpect(jsonPath("$.pricePerMonth").value(mockRoom.getPricePerMonth()))
                                .andExpect(jsonPath("$.area").value(mockRoom.getArea()));
        }

        @Test
        public void testUpdateRoom_WithKeepImageIds() throws Exception {
                // Arrange
                Long roomId = 1L;
                AddRoomDTO requestDTO = createMockAddRoomDTO();
                Room mockRoom = createMockRoom();
                List<Long> keepImageIds = Arrays.asList(1L, 2L);

                when(roomService.updateRoom(eq(roomId), any(AddRoomDTO.class), eq(keepImageIds),
                                any(MultipartFile[].class)))
                                .thenReturn(mockRoom);

                // Chuẩn bị multipart file cho room (JSON)
                MockMultipartFile roomPart = new MockMultipartFile(
                                "room", "", "application/json",
                                objectMapper.writeValueAsBytes(requestDTO));

                // Chuẩn bị multipart file cho keepImageIds (JSON array)
                MockMultipartFile keepImageIdsPart = new MockMultipartFile(
                                "keepImageIds", "", "application/json",
                                objectMapper.writeValueAsBytes(keepImageIds));

                // 👇 Bổ sung file images giả (có thể rỗng)
                MockMultipartFile imagePart = new MockMultipartFile(
                                "images", "test.jpg", "image/jpeg", "fake image".getBytes());

                // Act & Assert
                mockMvc.perform(multipart("/mpbhms/rooms/{id}", roomId)
                                .file(roomPart)
                                .file(keepImageIdsPart)
                                .file(imagePart) // 👈 THÊM DÒNG NÀY
                                .contentType(MediaType.MULTIPART_FORM_DATA))
                                .andDo(print()) // Debug kỹ
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.id").value(mockRoom.getId()))
                                .andExpect(jsonPath("$.roomNumber").value(mockRoom.getRoomNumber()));
        }

        @Test
        public void testUpdateRoom_InvalidJson() throws Exception {
                MockMultipartFile roomPart = new MockMultipartFile(
                                "room", "room", "application/json", "abc".getBytes(StandardCharsets.UTF_8)); // lỗi JSON

                mockMvc.perform(multipart("/mpbhms/rooms/{id}", 1L)
                                .file(roomPart)
                                .with(request -> {
                                        request.setMethod("PUT");
                                        return request;
                                }) // bắt buộc vì multipart() mặc định là POST
                                .contentType(MediaType.MULTIPART_FORM_DATA))
                                .andExpect(status().isInternalServerError());

        }

        @Test
        public void testUpdateRoom_RoomNotFound() throws Exception {
                // Arrange
                Long roomId = 999L;
                AddRoomDTO requestDTO = createMockAddRoomDTO(); // Đã đủ dữ liệu hợp lệ

                lenient().when(roomService.updateRoom(
                                eq(roomId),
                                any(AddRoomDTO.class),
                                eq(Collections.emptyList()),
                                isNull())).thenThrow(new com.mpbhms.backend.exception.ResourceNotFoundException(
                                                "Phòng không tồn tại"));

                String roomJson = objectMapper.writeValueAsString(requestDTO); // Serialize chính xác
                String keepImageIdsJson = objectMapper.writeValueAsString(Collections.emptyList());

                // Act & Assert
                mockMvc.perform(
                                multipart("/mpbhms/rooms/{id}", roomId)
                                                .file(new MockMultipartFile("room", "room", "application/json",
                                                                roomJson.getBytes()))
                                                .file(new MockMultipartFile("keepImageIds", "keepImageIds",
                                                                "application/json", keepImageIdsJson.getBytes())))
                                .andDo(print())
                                .andExpect(status().isNotFound())
                                .andExpect(jsonPath("$.status").value(404))
                                .andExpect(jsonPath("$.error").value("RESOURCE_NOT_FOUND"))
                                .andExpect(jsonPath("$.message").value("Phòng không tồn tại"))
                                .andExpect(jsonPath("$.data").value(org.hamcrest.Matchers.nullValue()));
        }

        @Test
        public void testUpdateRoom_InvalidId() throws Exception {
                // Arrange
                Long invalidRoomId = 9999L;
                AddRoomDTO requestDTO = createMockAddRoomDTO(); // ✅ Khai báo biến bị thiếu

                lenient().when(roomService.updateRoom(eq(invalidRoomId), any(), any(), any()))
                                .thenThrow(new EntityNotFoundException("Room not found"));

                // Act & Assert
                mockMvc.perform(
                                multipart("/mpbhms/rooms/{id}", invalidRoomId)
                                                .file(new MockMultipartFile("room", "", "application/json",
                                                                objectMapper.writeValueAsBytes(requestDTO)))
                                                .with(request -> {
                                                        request.setMethod("PUT");
                                                        return request;
                                                }) // ⚠️ Quan trọng
                )
                                .andExpect(status().isInternalServerError());
        }

        // ==================== TEST DELETE ROOM ====================

        @Test
        public void testDeleteRoom_Success() throws Exception {
                // Arrange
                Long roomId = 1L;
                doNothing().when(roomService).deleteRoom(roomId);

                // Act & Assert
                mockMvc.perform(delete("/mpbhms/rooms/{id}", roomId))
                                .andExpect(status().isNoContent());
        }

        @Test
        public void testDeleteRoom_RoomNotFound() throws Exception {
                // Arrange
                Long roomId = 999L;
                doThrow(new NotFoundException("Không tìm thấy phòng"))
                                .when(roomService).deleteRoom(roomId);

                // Act & Assert
                mockMvc.perform(delete("/mpbhms/rooms/{id}", roomId))
                                .andExpect(status().isBadRequest());
        }

        @Test
        public void testDeleteRoom_InvalidId() throws Exception {
                // Act & Assert
                mockMvc.perform(delete("/mpbhms/rooms/{id}", "invalid"))
                                .andExpect(status().isBadRequest());
        }

        // ==================== TEST RESTORE ROOM ====================

        @Test
        public void testRestoreRoom_Success() throws Exception {
                // Arrange
                Long roomId = 1L;
                doNothing().when(roomService).restoreRoom(roomId);

                // Act & Assert
                mockMvc.perform(patch("/mpbhms/rooms/{id}/restore", roomId))
                                .andExpect(status().isOk());
        }

        @Test
        public void testRestoreRoom_RoomNotFound() throws Exception {
                // Arrange
                Long roomId = 999L;
                doThrow(new NotFoundException("Không tìm thấy phòng"))
                                .when(roomService).restoreRoom(roomId);

                // Act & Assert
                mockMvc.perform(patch("/mpbhms/rooms/{id}/restore", roomId))
                                .andExpect(status().isBadRequest());
        }

        @Test
        public void testRestoreRoom_InvalidId() throws Exception {
                // Act & Assert
                mockMvc.perform(patch("/mpbhms/rooms/{id}/restore", "invalid"))
                                .andExpect(status().isBadRequest());
        }

        // ==================== TEST GET ROOMS WITH RENTER ====================

        @Test
        public void testGetAllRoomsWithRenter_Success() throws Exception {
                // Arrange
                ResultPaginationDTO mockResult = createMockResultPaginationDTO();
                when(roomService.getAllRoomsWithRenter(any(Pageable.class)))
                                .thenReturn(mockResult);

                // Act & Assert
                mockMvc.perform(get("/mpbhms/rooms/with-renter")
                                .param("page", "0")
                                .param("size", "10"))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.result").exists());
        }

        @Test
        public void testGetAllRoomsWithRenter_BadRequest() throws Exception {
                mockMvc.perform(get("/mpbhms/rooms/with-renter")
                                .param("page", "-1")
                                .param("size", "0"))
                                .andExpect(status().isOk());
        }

        @Test
        public void testGetAllRoomsWithRenter_ServiceException() throws Exception {
                // Arrange
                lenient().when(roomService.getAllRoomsWithRenter(any(Pageable.class)))
                                .thenThrow(new RuntimeException("Lỗi database"));

                // Act & Assert
                mockMvc.perform(get("/mpbhms/rooms/with-renter")
                                .param("page", "0")
                                .param("size", "10"))
                                .andExpect(status().isBadRequest());
        }

        // ==================== TEST GET DELETED ROOMS ====================

        @Test
        public void testGetDeletedRooms_Success() throws Exception {
                // Arrange
                ResultPaginationDTO mockResult = createMockResultPaginationDTO();
                lenient().when(roomService.getDeletedRooms(any(Pageable.class))).thenReturn(mockResult);

                // Act & Assert
                mockMvc.perform(get("/mpbhms/rooms/deleted")
                                .param("page", "0")
                                .param("size", "10"))
                                .andDo(print())
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.result").exists());
        }

        @Test
        public void testGetDeletedRooms_ServiceException() throws Exception {
                // Arrange
                lenient().when(roomService.getDeletedRooms(any(Pageable.class)))
                                .thenThrow(new RuntimeException("Lỗi database"));

                // Act & Assert
                mockMvc.perform(get("/mpbhms/rooms/deleted")
                                .param("page", "0")
                                .param("size", "10"))
                                .andExpect(status().isBadRequest());
        }

        // ==================== TEST GET ROOM BY ID ====================

        @Test
        public void testGetRoomById_Success() throws Exception {
                // Arrange
                Long roomId = 1L;
                Room mockRoom = createMockRoom();
                RoomDTO mockRoomDTO = createMockRoomDTO();

                when(roomService.getRoomById(roomId)).thenReturn(mockRoom);
                when(roomService.convertToRoomDTO(mockRoom)).thenReturn(mockRoomDTO);

                // Act & Assert
                mockMvc.perform(get("/mpbhms/rooms/{id}", roomId))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.id").value(mockRoomDTO.getId()))
                                .andExpect(jsonPath("$.roomNumber").value(mockRoomDTO.getRoomNumber()));
        }

        @Test
        public void testGetRoomById_RoomNotFound() throws Exception {
                // Arrange
                Long roomId = 999L;
                when(roomService.getRoomById(roomId))
                                .thenThrow(new NotFoundException("Không tìm thấy phòng"));

                // Act & Assert
                mockMvc.perform(get("/mpbhms/rooms/{id}", roomId))
                                .andExpect(status().isBadRequest());
        }

        @Test
        public void testGetRoomById_InvalidId() throws Exception {
                // Act & Assert
                mockMvc.perform(get("/mpbhms/rooms/{id}", "invalid"))
                                .andExpect(status().isBadRequest());
        }

        // ==================== TEST ADD SERVICE TO ROOM ====================

        @Test
        public void testAddServiceToRoom_Success() throws Exception {
                // Arrange
                Long roomId = 1L;
                Long serviceId = 1L;
                Map<String, Object> requestBody = new HashMap<>();
                requestBody.put("serviceId", serviceId);

                when(roomService.addServiceToRoom(roomId, serviceId, null))
                                .thenReturn(true);

                // Act & Assert
                mockMvc.perform(post("/mpbhms/rooms/{roomId}/add-service", roomId)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(requestBody)))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.serviceReadingCreated").value(true));
        }

        @Test
        public void testAddServiceToRoom_WithInitialReading() throws Exception {
                // Arrange
                Long roomId = 1L;
                Long serviceId = 1L;
                BigDecimal initialReading = new BigDecimal("100.5");
                Map<String, Object> requestBody = new HashMap<>();
                requestBody.put("serviceId", serviceId);
                requestBody.put("initialReading", initialReading);

                when(roomService.addServiceToRoom(roomId, serviceId, initialReading))
                                .thenReturn(true);

                // Act & Assert
                mockMvc.perform(post("/mpbhms/rooms/{roomId}/add-service", roomId)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(requestBody)))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.serviceReadingCreated").value(true));
        }

        @Test
        public void testAddServiceToRoom_InvalidRoomId() throws Exception {
                // Arrange
                Map<String, Object> requestBody = new HashMap<>();
                requestBody.put("serviceId", 1L);

                // Act & Assert
                mockMvc.perform(post("/mpbhms/rooms/{roomId}/add-service", "invalid")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(requestBody)))
                                .andExpect(status().isBadRequest());
        }

        @Test
        public void testAddServiceToRoom_ServiceException() throws Exception {
                // Arrange
                Long roomId = 1L;
                Long serviceId = 1L;
                Map<String, Object> requestBody = new HashMap<>();
                requestBody.put("serviceId", serviceId);

                when(roomService.addServiceToRoom(roomId, serviceId, null))
                                .thenThrow(new BusinessException("Service đã tồn tại cho phòng này"));

                // Act & Assert
                mockMvc.perform(post("/mpbhms/rooms/{roomId}/add-service", roomId)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(requestBody)))
                                .andExpect(status().isBadRequest());
        }

        // ==================== HELPER METHODS ====================

        private AddRoomDTO createMockAddRoomDTO() {
                AddRoomDTO dto = new AddRoomDTO();
                dto.setRoomNumber("A101");
                dto.setArea(new BigDecimal("50"));
                dto.setPricePerMonth(5000000.0);
                dto.setRoomStatus("Available"); // phải là chuỗi hợp lệ
                dto.setNumberOfBedrooms(2);
                dto.setNumberOfBathrooms(1);
                dto.setDescription("Phòng đẹp, đầy đủ tiện nghi");
                dto.setMaxOccupants(4);
                dto.setBuilding("Tòa A");
                dto.setIsActive(true);
                return dto;
        }

        private Room createMockRoom() {
                Room room = new Room();
                room.setId(1L);
                room.setRoomNumber("A101");
                room.setArea(new BigDecimal("50.0"));
                room.setPricePerMonth(5000000.0);
                room.setRoomStatus(RoomStatus.Available);
                room.setNumberOfBedrooms(2);
                room.setNumberOfBathrooms(1);
                room.setDescription("Phòng đẹp, view đẹp");
                room.setMaxOccupants(4);
                room.setBuilding("Tòa A");
                room.setDeleted(false);
                return room;
        }

        private RoomDTO createMockRoomDTO() {
                RoomDTO dto = new RoomDTO();
                dto.setId(1L);
                dto.setRoomNumber("A101");
                dto.setArea(new BigDecimal("50.0"));
                dto.setPricePerMonth(5000000.0);
                dto.setRoomStatus(RoomStatus.Available.name());
                dto.setNumberOfBedrooms(2);
                dto.setNumberOfBathrooms(1);
                dto.setDescription("Phòng đẹp, view đẹp");
                dto.setMaxOccupants(4);
                dto.setBuilding("Tòa A");
                return dto;
        }

        private ResultPaginationDTO createMockResultPaginationDTO() {
                ResultPaginationDTO result = new ResultPaginationDTO();
                result.setResult(Arrays.asList(createMockRoomDTO()));
                com.mpbhms.backend.dto.Meta meta = new com.mpbhms.backend.dto.Meta();
                meta.setPage(0);
                meta.setPageSize(10);
                meta.setPages(1);
                meta.setTotal(1L);
                result.setMeta(meta);
                return result;
        }
}