package com.mpbhms.backend;

import com.mpbhms.backend.controller.OcrControlController;
import com.mpbhms.backend.entity.CustomService;
import com.mpbhms.backend.entity.Room;
import com.mpbhms.backend.entity.ScanLog;
import com.mpbhms.backend.entity.ServiceReading;
import com.mpbhms.backend.enums.ServiceType;
import com.mpbhms.backend.repository.RoomRepository;
import com.mpbhms.backend.repository.ScanLogRepository;
import com.mpbhms.backend.repository.ServiceReadingRepository;
import com.mpbhms.backend.repository.ServiceRepository;
import com.mpbhms.backend.service.AutoElectricMeterScanner;
import com.mpbhms.backend.service.OcrCccdService;
import com.mpbhms.backend.service.ScanLogService;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;

import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import org.springframework.data.domain.*;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Standalone test (không load Spring context)
 * - Dùng Mockito để inject mock vào controller
 * - Dùng MockMvcBuilders.standaloneSetup(controller)
 * Ưu điểm: tránh triệt để lỗi Failed to load ApplicationContext.
 */
@ExtendWith(MockitoExtension.class)
public class OcrControlControllerTest {

    private MockMvc mockMvc;

    // === Mocks DI vào controller ===
    @Mock private AutoElectricMeterScanner scanner;
    @Mock private ScanLogService scanLogService;
    @Mock private OcrCccdService ocrCccdService;

    @Mock private RoomRepository roomRepository;
    @Mock private ServiceReadingRepository serviceReadingRepository;
    @Mock private ServiceRepository serviceRepository;
    @Mock private ScanLogRepository scanLogRepository;

    // Controller cần được tiêm các mock trên
    @InjectMocks
    private OcrControlController controller;

    @BeforeEach
    void setup() {
        // Không kéo security/filters gì cả
        mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
    }

    @Test
    void enableAutoScan() throws Exception {
        doNothing().when(scanner).setEnabled(true);

        mockMvc.perform(post("/mpbhms/ocr/auto-scan/on"))
                .andExpect(status().isOk())
                .andExpect(content().string("Auto scan ENABLED"));
    }

    @Test
    void disableAutoScan() throws Exception {
        doNothing().when(scanner).setEnabled(false);

        mockMvc.perform(post("/mpbhms/ocr/auto-scan/off"))
                .andExpect(status().isOk())
                .andExpect(content().string("Auto scan DISABLED"));
    }

    @Test
    void getStatus_on() throws Exception {
        when(scanner.isEnabled()).thenReturn(true);

        mockMvc.perform(get("/mpbhms/ocr/auto-scan/status"))
                .andExpect(status().isOk())
                .andExpect(content().string("Auto scan ON"));
    }

    @Test
    void getStatus_off() throws Exception {
        when(scanner.isEnabled()).thenReturn(false);

        mockMvc.perform(get("/mpbhms/ocr/auto-scan/status"))
                .andExpect(status().isOk())
                .andExpect(content().string("Auto scan OFF"));
    }

    @Test
    void getInterval() throws Exception {
        when(scanner.getInterval()).thenReturn(5000L);

        mockMvc.perform(get("/mpbhms/ocr/auto-scan/interval"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.intervalMs").value(5000));
    }

    @Test
    void setInterval_valid() throws Exception {
        doNothing().when(scanner).setInterval(6000L);

        mockMvc.perform(post("/mpbhms/ocr/auto-scan/interval")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"intervalMs\": 6000}"))
                .andExpect(status().isOk())
                .andExpect(content().string("Scan interval updated to 6000ms"));
    }

    @Test
    void setInterval_invalid() throws Exception {
        mockMvc.perform(post("/mpbhms/ocr/auto-scan/interval")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"intervalMs\": -1}"))
                .andExpect(status().isBadRequest())
                .andExpect(content().string("Invalid interval"));
    }

    @Test
    void scanLogs_noRoom() throws Exception {
        ScanLog log = new ScanLog();
        log.setId(1L);
        log.setFileName("test.jpg");
        log.setRoomId(1L);
        log.setResult("ok");
        log.setScanTime(Instant.now());

        Page<ScanLog> page = new PageImpl<>(List.of(log), PageRequest.of(0,10), 1);
        when(scanLogService.getScanLogs(any(Pageable.class))).thenReturn(page);

        mockMvc.perform(get("/mpbhms/ocr/scan-logs?page=0&size=10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value(1))
                .andExpect(jsonPath("$.content[0].fileName").value("test.jpg"));
    }

    @Test
    void scanLogs_withRoom() throws Exception {
        ScanLog log = new ScanLog();
        log.setId(1L);
        log.setFileName("test.jpg");
        log.setRoomId(2L);
        log.setResult("ok");
        log.setScanTime(Instant.now());

        Page<ScanLog> page = new PageImpl<>(List.of(log), PageRequest.of(0,10), 1);
        when(scanLogService.getScanLogsByRoomId(eq(2L), any(Pageable.class))).thenReturn(page);

        mockMvc.perform(get("/mpbhms/ocr/scan-logs?page=0&size=10&roomId=2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].roomId").value(2));
    }

    @Test
    void currentScanning_hasValue() throws Exception {
        when(scanner.getCurrentScanningFile()).thenReturn("Room101/image1.jpg");

        mockMvc.perform(get("/mpbhms/ocr/current-scanning"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.current").value("Room101/image1.jpg"));
    }

    @Test
    void currentScanning_null() throws Exception {
        when(scanner.getCurrentScanningFile()).thenReturn(null);

        mockMvc.perform(get("/mpbhms/ocr/current-scanning"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.current").value(""));
    }

    @Test
    void ocrCccd_success() throws Exception {
        MockMultipartFile front = new MockMultipartFile("front","front.jpg","image/jpeg","front".getBytes());
        MockMultipartFile back  = new MockMultipartFile("back","back.jpg","image/jpeg","back".getBytes());

        Map<String,Object> result = Map.of(
                "name","Nguyen Van A",
                "dob","2000-01-01",
                "nationalID","123456789012"
        );
        when(ocrCccdService.ocrCccd(any(), any())).thenReturn(result);

        mockMvc.perform(multipart("/mpbhms/ocr/cccd").file(front).file(back))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Nguyen Van A"))
                .andExpect(jsonPath("$.dob").value("2000-01-01"))
                .andExpect(jsonPath("$.nationalID").value("123456789012"));
    }

    @Test
    void ocrCccd_fail() throws Exception {
        MockMultipartFile front = new MockMultipartFile("front","front.jpg","image/jpeg","front".getBytes());
        MockMultipartFile back  = new MockMultipartFile("back","back.jpg","image/jpeg","back".getBytes());

        when(ocrCccdService.ocrCccd(any(), any())).thenThrow(new RuntimeException("OCR failed"));

        mockMvc.perform(multipart("/mpbhms/ocr/cccd").file(front).file(back))
                .andExpect(status().isBadRequest())
                .andExpect(content().string("Error processing CCCD: OCR failed"));
    }



    @Test
    void manualReading_roomNotFound() throws Exception {
        when(roomRepository.findById(99L)).thenReturn(Optional.empty());

        mockMvc.perform(multipart("/mpbhms/ocr/manual-electric-reading")
                        .param("roomId","99").param("newReading","200.000"))
                .andExpect(status().isBadRequest())
                .andExpect(content().string("Error processing manual reading: Room not found with id: 99"));
    }

    @Test
    void manualReading_serviceNotFound() throws Exception {
        Room room = new Room(); room.setId(1L); room.setRoomNumber("101");
        when(roomRepository.findById(1L)).thenReturn(Optional.of(room));
        when(serviceRepository.findByServiceType(ServiceType.ELECTRICITY)).thenReturn(null);

        mockMvc.perform(multipart("/mpbhms/ocr/manual-electric-reading")
                        .param("roomId","1").param("newReading","200.000"))
                .andExpect(status().isBadRequest())
                .andExpect(content().string("Electricity service not found"));
    }

    @Test
    void getElectricReadings_success() throws Exception {
        Room room = new Room(); room.setId(1L); room.setRoomNumber("101");
        CustomService elec = new CustomService(); elec.setId(1L); elec.setServiceType(ServiceType.ELECTRICITY);
        ServiceReading r1 = new ServiceReading(); r1.setId(1L); r1.setOldReading(new BigDecimal("100.000")); r1.setNewReading(new BigDecimal("150.000"));
        ServiceReading r2 = new ServiceReading(); r2.setId(2L); r2.setOldReading(new BigDecimal("150.000")); r2.setNewReading(new BigDecimal("200.000"));

        when(roomRepository.findById(1L)).thenReturn(Optional.of(room));
        when(serviceRepository.findByServiceType(ServiceType.ELECTRICITY)).thenReturn(elec);
        when(serviceReadingRepository.findByRoomAndService(room, elec)).thenReturn(List.of(r1, r2));

        mockMvc.perform(get("/mpbhms/ocr/electric-readings/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.roomNumber").value("101"))
                .andExpect(jsonPath("$.readings").isArray())
                .andExpect(jsonPath("$.totalReadings").value(2));
    }

    @Test
    void getElectricReadings_roomNotFound() throws Exception {
        when(roomRepository.findById(1L)).thenReturn(Optional.empty());

        mockMvc.perform(get("/mpbhms/ocr/electric-readings/1"))
                .andExpect(status().isBadRequest())
                .andExpect(content().string("Error getting readings: Room not found with id: 1"));
    }

    @Test
    void getElectricReadings_serviceNotFound() throws Exception {
        Room room = new Room(); room.setId(1L); room.setRoomNumber("101");
        when(roomRepository.findById(1L)).thenReturn(Optional.of(room));
        when(serviceRepository.findByServiceType(ServiceType.ELECTRICITY)).thenReturn(null);

        mockMvc.perform(get("/mpbhms/ocr/electric-readings/1"))
                .andExpect(status().isBadRequest())
                .andExpect(content().string("Electricity service not found"));
    }
}
