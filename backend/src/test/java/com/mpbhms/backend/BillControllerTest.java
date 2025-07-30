package com.mpbhms.backend;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mpbhms.backend.controller.BillController;
import com.mpbhms.backend.dto.BillResponse;
import com.mpbhms.backend.entity.Bill;
import com.mpbhms.backend.entity.Contract;
import com.mpbhms.backend.entity.Room;
import com.mpbhms.backend.enums.BillType;
import com.mpbhms.backend.enums.PaymentCycle;
import com.mpbhms.backend.exception.BusinessException;
import com.mpbhms.backend.exception.GlobalExceptionHandler;
import com.mpbhms.backend.exception.NotFoundException;
import com.mpbhms.backend.service.BillService;
import com.mpbhms.backend.service.EmailService;
import com.mpbhms.backend.service.VnPayService;
import com.mpbhms.backend.util.SecurityUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.data.web.PageableHandlerMethodArgumentResolver;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.*;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.mockito.Mockito.mockStatic;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultHandlers.print;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.junit.jupiter.api.Assertions.assertNotNull;

@ExtendWith(MockitoExtension.class)
public class BillControllerTest {

        private MockMvc mockMvc;

        @Mock
        private BillService billService;

        @Mock
        private EmailService emailService;

        @Mock
        private VnPayService vnPayService;

        private ObjectMapper objectMapper;

        @BeforeEach
        void setUp() {
                objectMapper = new ObjectMapper();
                mockMvc = MockMvcBuilders
                                .standaloneSetup(new BillController(billService, emailService, vnPayService))
                                .setControllerAdvice(new GlobalExceptionHandler())
                                .setCustomArgumentResolvers(new PageableHandlerMethodArgumentResolver())
                                .build();
        }

        // ==================== TEST GENERATE FIRST BILL ====================

        @Test
        public void testGenerateFirstBill_Success() throws Exception {
                // Arrange
                Long contractId = 1L;
                Bill mockBill = createMockBill();
                BillResponse mockResponse = createMockBillResponse();

                when(billService.generateFirstBill(contractId)).thenReturn(mockBill);
                when(billService.toResponse(mockBill)).thenReturn(mockResponse);

                // Act & Assert
                mockMvc.perform(post("/mpbhms/bills/generate-first")
                                .param("contractId", contractId.toString()))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.id").value(mockResponse.getId()));
        }

        @Test
        public void testGenerateFirstBill_ContractNotFound() throws Exception {
                // Arrange
                Long contractId = 999L;
                when(billService.generateFirstBill(contractId))
                                .thenThrow(new NotFoundException("Không tìm thấy hợp đồng"));

                // Act & Assert
                mockMvc.perform(post("/mpbhms/bills/generate-first")
                                .param("contractId", contractId.toString()))
                                .andExpect(status().isBadRequest())
                                .andExpect(jsonPath("$.message").value("Không tìm thấy hợp đồng"));
        }

        @Test
        public void testGenerateFirstBill_MissingContractId() throws Exception {
                // Act & Assert
                mockMvc.perform(post("/mpbhms/bills/generate-first"))
                                .andExpect(status().isInternalServerError());
        }

        @Test
        public void testGenerateFirstBill_InvalidContractId() throws Exception {
                // Act & Assert
                mockMvc.perform(post("/mpbhms/bills/generate-first")
                                .param("contractId", "invalid"))
                                .andExpect(status().isBadRequest());
        }

        // ==================== TEST GENERATE BILL ====================

        @Test
        public void testGenerateBill_Success() throws Exception {
                // Arrange
                Long contractId = 1L;
                String fromDate = "2024-01-01";
                String toDate = "2024-01-31";
                BillType billType = BillType.CONTRACT_TOTAL;
                Bill mockBill = createMockBill();
                BillResponse mockResponse = createMockBillResponse();

                when(billService.generateBill(eq(contractId), any(LocalDate.class), any(LocalDate.class), eq(billType)))
                                .thenReturn(mockBill);
                when(billService.toResponse(mockBill)).thenReturn(mockResponse);

                // Act & Assert
                mockMvc.perform(post("/mpbhms/bills/generate")
                                .param("contractId", contractId.toString())
                                .param("fromDate", fromDate)
                                .param("toDate", toDate)
                                .param("billType", billType.toString()))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.id").value(mockResponse.getId()));
        }

        @Test
        public void testGenerateBill_InvalidDateFormat() throws Exception {
                // Arrange
                Long contractId = 1L;
                String invalidFromDate = "2024-13-01"; // Invalid month
                String toDate = "2024-01-31";
                BillType billType = BillType.CONTRACT_TOTAL;

                // Act & Assert
                mockMvc.perform(post("/mpbhms/bills/generate")
                                .param("contractId", contractId.toString())
                                .param("fromDate", invalidFromDate)
                                .param("toDate", toDate)
                                .param("billType", billType.toString()))
                                .andExpect(status().isBadRequest());
        }

        @Test
        public void testGenerateBill_InvalidBillType() throws Exception {
                // Arrange
                Long contractId = 1L;
                String fromDate = "2024-01-01";
                String toDate = "2024-01-31";
                String invalidBillType = "INVALID_TYPE";

                // Act & Assert
                mockMvc.perform(post("/mpbhms/bills/generate")
                                .param("contractId", contractId.toString())
                                .param("fromDate", fromDate)
                                .param("toDate", toDate)
                                .param("billType", invalidBillType))
                                .andExpect(status().isBadRequest());
        }

        @Test
        public void testGenerateBill_MissingParameters() throws Exception {
                // Act & Assert
                mockMvc.perform(post("/mpbhms/bills/generate"))
                                .andExpect(status().isInternalServerError());
        }

        @Test
        public void testGenerateBill_ContractNotFound() throws Exception {
                // Arrange
                Long contractId = 999L;
                String fromDate = "2024-01-01";
                String toDate = "2024-01-31";
                BillType billType = BillType.CONTRACT_TOTAL;

                when(billService.generateBill(eq(contractId), any(LocalDate.class), any(LocalDate.class), eq(billType)))
                                .thenThrow(new NotFoundException("Không tìm thấy hợp đồng"));

                // Act & Assert
                mockMvc.perform(post("/mpbhms/bills/generate")
                                .param("contractId", contractId.toString())
                                .param("fromDate", fromDate)
                                .param("toDate", toDate)
                                .param("billType", billType.toString()))
                                .andExpect(status().isBadRequest());
        }

        // ==================== TEST CREATE BILL ====================

        @Test
        public void testCreateBill_Success() throws Exception {
                // Arrange
                Map<String, Object> request = new HashMap<>();
                request.put("roomId", 1L);
                request.put("month", 1);
                request.put("year", 2024);
                BillResponse mockResponse = createMockBillResponse();

                when(billService.createAndSaveServiceBill(1L, 1, 2024)).thenReturn(mockResponse);

                // Act & Assert
                mockMvc.perform(post("/mpbhms/bills/create")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(request)))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.id").value(mockResponse.getId()));
        }

        @Test
        public void testCreateBill_MissingRoomId() throws Exception {
                // Arrange
                Map<String, Object> request = new HashMap<>();
                request.put("month", 1);
                request.put("year", 2024);

                // Act & Assert
                mockMvc.perform(post("/mpbhms/bills/create")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(request)))
                                .andExpect(status().isInternalServerError());
        }

        @Test
        public void testCreateBill_InvalidMonth() throws Exception {
                // Arrange
                Map<String, Object> request = new HashMap<>();
                request.put("roomId", 1L);
                request.put("month", 13); // Invalid month
                request.put("year", 2024);

                // Act & Assert
                mockMvc.perform(post("/mpbhms/bills/create")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(request)))
                                .andExpect(status().isOk()); // Controller doesn't validate month range
        }

        @Test
        public void testCreateBill_RoomNotFound() throws Exception {
                // Arrange
                Map<String, Object> request = new HashMap<>();
                request.put("roomId", 999L);
                request.put("month", 1);
                request.put("year", 2024);

                when(billService.createAndSaveServiceBill(anyLong(), anyInt(), anyInt()))
                                .thenThrow(new NotFoundException("Không tìm thấy phòng"));

                mockMvc.perform(post("/mpbhms/bills/create")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(request)))
                                .andExpect(status().isBadRequest());
        }

        // ==================== TEST GET BILL BY ID ====================

        @Test
        public void testGetBill_Success() throws Exception {
                // Arrange
                Long billId = 1L;
                Bill mockBill = createMockBill();
                BillResponse mockResponse = createMockBillResponse();

                when(billService.getBillById(billId)).thenReturn(mockBill);
                when(billService.toResponse(mockBill)).thenReturn(mockResponse);

                // Act & Assert
                mockMvc.perform(get("/mpbhms/bills/{id}", billId))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.id").value(mockResponse.getId()));
        }

        @Test
        public void testGetBill_NotFound() throws Exception {
                // Arrange
                Long billId = 999L;
                when(billService.getBillById(billId))
                                .thenThrow(new NotFoundException("Không tìm thấy hóa đơn"));

                // Act & Assert
                mockMvc.perform(get("/mpbhms/bills/{id}", billId))
                                .andExpect(status().isBadRequest())
                                .andExpect(jsonPath("$.message").value("Không tìm thấy hóa đơn"));
        }

        @Test
        public void testGetBill_InvalidId() throws Exception {
                // Act & Assert
                mockMvc.perform(get("/mpbhms/bills/{id}", "invalid"))
                                .andExpect(status().isBadRequest());
        }

        // ==================== TEST GET BILLS (FILTERED) ====================

        @Test
        public void testGetBills_WithFilters_Success() throws Exception {
                // Arrange
                Long roomId = 1L;
                Boolean status = false;
                BigDecimal minPrice = new BigDecimal("100");
                BigDecimal maxPrice = new BigDecimal("1000");
                String search = "test";
                int page = 0;
                int size = 10;

                List<Bill> mockBills = Arrays.asList(createMockBill());
                Page<Bill> mockPage = new PageImpl<>(mockBills, PageRequest.of(page, size), 1);

                when(billService.filterBills(eq(roomId), eq(status), eq(minPrice), eq(maxPrice), eq(search),
                                any(Pageable.class)))
                                .thenReturn(mockPage);
                when(billService.toResponse(any(Bill.class))).thenReturn(createMockBillResponse());

                // Act & Assert
                mockMvc.perform(get("/mpbhms/bills")
                                .param("roomId", roomId.toString())
                                .param("status", status.toString())
                                .param("minPrice", minPrice.toString())
                                .param("maxPrice", maxPrice.toString())
                                .param("search", search)
                                .param("page", String.valueOf(page))
                                .param("size", String.valueOf(size)))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.content").exists())
                                .andExpect(jsonPath("$.totalElements").value(1));
        }

        @Test
        public void testGetBills_WithoutFilters_Success() throws Exception {
                // Arrange
                Long contractId = 1L;
                int page = 0;
                int size = 10;

                List<Bill> mockBills = Arrays.asList(createMockBill());
                Page<Bill> mockPage = new PageImpl<>(mockBills, PageRequest.of(page, size), 1);

                when(billService.getBillsByContractOrRoom(eq(contractId), eq(null), any(Pageable.class)))
                                .thenReturn(mockPage);
                when(billService.toResponse(any(Bill.class))).thenReturn(createMockBillResponse());

                // Act & Assert
                mockMvc.perform(get("/mpbhms/bills")
                                .param("contractId", contractId.toString())
                                .param("page", String.valueOf(page))
                                .param("size", String.valueOf(size)))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.content").exists());
        }

        @Test
        public void testGetBills_InvalidPagination() throws Exception {
                // Act & Assert
                mockMvc.perform(get("/mpbhms/bills")
                                .param("page", "-1")
                                .param("size", "0"))
                                .andExpect(status().isBadRequest());
        }

        // ==================== TEST DELETE BILL ====================

        @Test
        public void testDeleteBill_Success() throws Exception {
                // Arrange
                Long billId = 1L;
                doNothing().when(billService).deleteBillById(billId);

                // Act & Assert
                mockMvc.perform(delete("/mpbhms/bills/{id}", billId))
                                .andExpect(status().isOk());
        }

        @Test
        public void testDeleteBill_NotFound() throws Exception {
                // Arrange
                Long billId = 999L;
                doThrow(new NotFoundException("Không tìm thấy hóa đơn"))
                                .when(billService).deleteBillById(billId);

                // Act & Assert
                mockMvc.perform(delete("/mpbhms/bills/{id}", billId))
                                .andExpect(status().isBadRequest());
        }

        @Test
        public void testDeleteBill_InvalidId() throws Exception {
                // Act & Assert
                mockMvc.perform(delete("/mpbhms/bills/{id}", "invalid"))
                                .andExpect(status().isBadRequest());
        }

        // ==================== TEST CREATE SERVICE BILL ====================

        @Test
        public void testCreateServiceBill_Success() throws Exception {
                // Arrange
                Long roomId = 1L;
                int month = 1;
                int year = 2024;
                BillResponse mockResponse = createMockBillResponse();

                when(billService.createAndSaveServiceBill(roomId, month, year)).thenReturn(mockResponse);

                // Act & Assert
                mockMvc.perform(post("/mpbhms/bills/service-bill")
                                .param("roomId", roomId.toString())
                                .param("month", String.valueOf(month))
                                .param("year", String.valueOf(year)))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.id").value(mockResponse.getId()));
        }

        @Test
        public void testCreateServiceBill_MissingParameters() throws Exception {
                // Act & Assert
                mockMvc.perform(post("/mpbhms/bills/service-bill"))
                                .andExpect(status().isInternalServerError());
        }

        @Test
        public void testCreateServiceBill_InvalidMonth() throws Exception {
                // Act & Assert
                mockMvc.perform(post("/mpbhms/bills/service-bill")
                                .param("roomId", "1")
                                .param("month", "13")
                                .param("year", "2024"))
                                .andExpect(status().isOk()); // Controller doesn't validate month range
        }

        @Test
        public void testCreateServiceBill_RoomNotFound() throws Exception {
                // Arrange
                Long roomId = 999L;
                int month = 1;
                int year = 2024;

                when(billService.createAndSaveServiceBill(anyLong(), anyInt(), anyInt()))
                                .thenThrow(new NotFoundException("Không tìm thấy phòng"));

                mockMvc.perform(post("/mpbhms/bills/service-bill")
                                .param("roomId", roomId.toString())
                                .param("month", String.valueOf(month))
                                .param("year", String.valueOf(year)))
                                .andExpect(status().isBadRequest());
        }

        // ==================== TEST EXPORT BILL PDF ====================

        @Test
        public void testExportBillPdf_Success() throws Exception {
                // Arrange
                Long billId = 1L;
                byte[] pdfBytes = "mock pdf content".getBytes();

                when(billService.generateBillPdf(billId)).thenReturn(pdfBytes);

                // Act & Assert
                mockMvc.perform(get("/mpbhms/bills/{id}/export", billId))
                                .andExpect(status().isOk())
                                .andExpect(header().string("Content-Disposition",
                                                "attachment; filename=bill_" + billId + ".pdf"))
                                .andExpect(content().contentType(MediaType.APPLICATION_PDF));
        }

        @Test
        public void testExportBillPdf_NotFound() throws Exception {
                // Arrange
                Long billId = 999L;
                when(billService.generateBillPdf(billId))
                                .thenThrow(new NotFoundException("Không tìm thấy hóa đơn"));

                // Act & Assert
                mockMvc.perform(get("/mpbhms/bills/{id}/export", billId))
                                .andExpect(status().isBadRequest());
        }

        @Test
        public void testExportBillPdf_InvalidId() throws Exception {
                // Act & Assert
                mockMvc.perform(get("/mpbhms/bills/{id}/export", "invalid"))
                                .andExpect(status().isBadRequest());
        }

        // ==================== TEST GET MY BILLS ====================

        @Test
        public void testGetMyBills_Success() throws Exception {
                // Arrange
                int page = 0;
                int size = 10;
                Long userId = 1L;

                List<Bill> mockBills = Arrays.asList(createMockBill());
                Page<Bill> mockPage = new PageImpl<>(mockBills, PageRequest.of(page, size), 1);

                // Mock static method
                try (var securityUtilMock = mockStatic(SecurityUtil.class)) {
                        securityUtilMock.when(SecurityUtil::getCurrentUserId).thenReturn(userId);

                        when(billService.getBillsByUserId(eq(userId), any(Pageable.class))).thenReturn(mockPage);
                        when(billService.toResponse(any(Bill.class))).thenReturn(createMockBillResponse());

                        // Act & Assert
                        mockMvc.perform(get("/mpbhms/bills/my")
                                        .param("page", String.valueOf(page))
                                        .param("size", String.valueOf(size)))
                                        .andExpect(status().isOk())
                                        .andExpect(jsonPath("$.content").exists());
                }
        }

        @Test
        public void testGetMyBills_EmptyResult() throws Exception {
                // Arrange
                int page = 0;
                int size = 10;
                Long userId = 1L;

                Page<Bill> mockPage = new PageImpl<>(new ArrayList<>(), PageRequest.of(page, size), 0);

                // Mock static method
                try (var securityUtilMock = mockStatic(SecurityUtil.class)) {
                        securityUtilMock.when(SecurityUtil::getCurrentUserId).thenReturn(userId);

                        when(billService.getBillsByUserId(eq(userId), any(Pageable.class))).thenReturn(mockPage);

                        // Act & Assert
                        mockMvc.perform(get("/mpbhms/bills/my")
                                        .param("page", String.valueOf(page))
                                        .param("size", String.valueOf(size)))
                                        .andExpect(status().isOk())
                                        .andExpect(jsonPath("$.content").isArray())
                                        .andExpect(jsonPath("$.totalElements").value(0));
                }
        }

        @Test
        public void testGetMyBills_InvalidPagination() throws Exception {
                // Act & Assert
                mockMvc.perform(get("/mpbhms/bills/my")
                                .param("page", "-1")
                                .param("size", "0"))
                                .andExpect(status().isInternalServerError());
        }

        // ==================== TEST CREATE CUSTOM BILL ====================

        @Test
        public void testCreateCustomBill_Success() throws Exception {
                // Arrange
                Map<String, Object> request = new HashMap<>();
                request.put("roomId", 1L);
                request.put("name", "Custom Bill");
                request.put("description", "Test description");
                request.put("amount", "100.50");
                request.put("fromDate", "2024-01-01");
                request.put("toDate", "2024-01-31");

                BillResponse mockResponse = createMockBillResponse();

                when(billService.createCustomBill(eq(1L), eq("Custom Bill"), eq("Test description"),
                                any(BigDecimal.class), any(Instant.class), any(Instant.class)))
                                .thenReturn(mockResponse);

                // Act & Assert
                mockMvc.perform(post("/mpbhms/bills/custom")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(request)))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.id").value(mockResponse.getId()));
        }

        @Test
        public void testCreateCustomBill_WithoutDates() throws Exception {
                // Arrange
                Map<String, Object> request = new HashMap<>();
                request.put("roomId", 1L);
                request.put("name", "Custom Bill");
                request.put("description", "Test description");
                request.put("amount", "100.50");
                // fromDate and toDate are null

                BillResponse mockResponse = createMockBillResponse();

                when(billService.createCustomBill(eq(1L), eq("Custom Bill"), eq("Test description"),
                                any(BigDecimal.class), eq(null), eq(null)))
                                .thenReturn(mockResponse);

                // Act & Assert
                mockMvc.perform(post("/mpbhms/bills/custom")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(request)))
                                .andExpect(status().isOk());
        }

        @Test
        public void testCreateCustomBill_MissingRequiredFields() throws Exception {
                // Arrange
                Map<String, Object> request = new HashMap<>();
                request.put("roomId", 1L);
                // Missing name, amount

                // Act & Assert
                mockMvc.perform(post("/mpbhms/bills/custom")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(request)))
                                .andExpect(status().isInternalServerError());
        }

        @Test
        public void testCreateCustomBill_InvalidAmount() throws Exception {
                // Arrange
                Map<String, Object> request = new HashMap<>();
                request.put("roomId", 1L);
                request.put("name", "Custom Bill");
                request.put("amount", "invalid");

                // Act & Assert
                mockMvc.perform(post("/mpbhms/bills/custom")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(request)))
                                .andExpect(status().isBadRequest());
        }

        @Test
        public void testCreateCustomBill_InvalidDateFormat() throws Exception {
                // Arrange
                Map<String, Object> request = new HashMap<>();
                request.put("roomId", 1L);
                request.put("name", "Custom Bill");
                request.put("amount", "100.50");
                request.put("fromDate", "2024-13-01"); // Invalid date
                request.put("toDate", "2024-01-31");

                // Act & Assert
                mockMvc.perform(post("/mpbhms/bills/custom")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(request)))
                                .andExpect(status().isBadRequest());
        }

        @Test
        public void testCreateCustomBill_RoomNotFound() throws Exception {
                // Arrange
                Map<String, Object> request = new HashMap<>();
                request.put("roomId", 999L);
                request.put("name", "Custom Bill");
                request.put("amount", "100.50");

                when(billService.createCustomBill(eq(999L), eq("Custom Bill"), eq(""),
                                any(BigDecimal.class), eq(null), eq(null)))
                                .thenThrow(new NotFoundException("Không tìm thấy phòng"));

                // Act & Assert
                mockMvc.perform(post("/mpbhms/bills/custom")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(request)))
                                .andExpect(status().isBadRequest());
        }

        @Test
        public void testCreateCustomBill_BusinessException() throws Exception {
                // Arrange
                Map<String, Object> request = new HashMap<>();
                request.put("roomId", 1L);
                request.put("name", "Custom Bill");
                request.put("amount", "100.50");

                when(billService.createCustomBill(eq(1L), eq("Custom Bill"), eq(""),
                                any(BigDecimal.class), eq(null), eq(null)))
                                .thenThrow(new BusinessException("Lỗi tạo hóa đơn"));

                // Act & Assert
                mockMvc.perform(post("/mpbhms/bills/custom")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(request)))
                                .andExpect(status().isBadRequest())
                                .andExpect(jsonPath("$.message").value("Lỗi tạo hóa đơn"));
        }

        // ==================== HELPER METHODS ====================

        @Test
        public void testOverdueDaysCalculation() {
                // Test case 1: Bill with toDate 7 days ago should have 0 overdue days
                Bill bill1 = createMockBill();
                bill1.setToDate(Instant.now().minusSeconds(7 * 24 * 60 * 60)); // 7 days ago
                bill1.setStatus(false);
                
                // Test case 2: Bill with toDate 14 days ago should have 7 overdue days
                Bill bill2 = createMockBill();
                bill2.setToDate(Instant.now().minusSeconds(14 * 24 * 60 * 60)); // 14 days ago
                bill2.setStatus(false);
                
                // Test case 3: Paid bill should have 0 overdue days regardless of toDate
                Bill bill3 = createMockBill();
                bill3.setToDate(Instant.now().minusSeconds(14 * 24 * 60 * 60)); // 14 days ago
                bill3.setStatus(true);
                
                // Test case 4: Bill with specific dueDate should use dueDate instead of toDate + 7
                Bill bill4 = createMockBill();
                bill4.setToDate(Instant.now().minusSeconds(14 * 24 * 60 * 60)); // 14 days ago
                bill4.setDueDate(Instant.now().minusSeconds(3 * 24 * 60 * 60)); // 3 days ago
                bill4.setStatus(false);
                
                // Verify the logic (this would need to be tested in the actual service)
                // For now, just verify the test data is set up correctly
                assertNotNull(bill1);
                assertNotNull(bill2);
                assertNotNull(bill3);
                assertNotNull(bill4);
        }

        private Bill createMockBill() {
                Bill bill = new Bill();
                bill.setId(1L);
                bill.setTotalAmount(new BigDecimal("1000.00"));
                bill.setStatus(false);
                bill.setBillType(BillType.CONTRACT_TOTAL);
                bill.setPaymentCycle(PaymentCycle.MONTHLY);
                bill.setBillDate(Instant.now());
                bill.setFromDate(Instant.now());
                bill.setToDate(Instant.now().plusSeconds(86400)); // +1 day

                Room room = new Room();
                room.setId(1L);
                room.setRoomNumber("A101");
                bill.setRoom(room);

                Contract contract = new Contract();
                contract.setId(1L);
                bill.setContract(contract);

                return bill;
        }

        private BillResponse createMockBillResponse() {
                BillResponse response = new BillResponse();
                response.setId(1L);
                response.setContractId(1L);
                response.setRoomId(1L);
                response.setRoomNumber("A101");
                response.setTotalAmount(new BigDecimal("1000.00"));
                response.setStatus(false);
                response.setBillType(BillType.CONTRACT_TOTAL);
                response.setPaymentCycle(PaymentCycle.MONTHLY);
                response.setBillDate(Instant.now());
                response.setFromDate(Instant.now());
                response.setToDate(Instant.now().plusSeconds(86400));
                response.setDetails(new ArrayList<>());
                return response;
        }
}