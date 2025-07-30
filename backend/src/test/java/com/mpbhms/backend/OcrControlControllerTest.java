package com.mpbhms.backend;

import com.mpbhms.backend.controller.OcrControlController;
import com.mpbhms.backend.entity.ScanLog;
import com.mpbhms.backend.service.AutoElectricMeterScanner;
import com.mpbhms.backend.service.OcrCccdService;
import com.mpbhms.backend.service.ScanLogService;
import com.mpbhms.backend.service.UserService;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.FilterType;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Page;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = OcrControlController.class,
        excludeFilters = {
                @ComponentScan.Filter(
                        type = FilterType.ASSIGNABLE_TYPE,
                        classes = com.mpbhms.backend.config.PermissionInterceptor.class
                )
        })
public class OcrControlControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private AutoElectricMeterScanner scanner;

    @MockBean
    private ScanLogService scanLogService;

    @MockBean
    private OcrCccdService ocrCccdService;

    @MockBean
    private UserService userService;

    @Test
    void shouldReturnStatusOkForGetStatus() throws Exception {
        mockMvc.perform(get("/mpbhms/ocr/auto-scan/status")
                        .with(user("test").roles("USER")))
                .andExpect(status().isOk());
    }

    @Test
    void testEnableAutoScan() throws Exception {
        mockMvc.perform(post("/mpbhms/ocr/auto-scan/on")
                        .with(csrf())
                        .with(user("test").roles("USER")))
                .andExpect(status().isOk())
                .andExpect(content().string("Auto scan ENABLED"));
    }

    @Test
    void testDisableAutoScan() throws Exception {
        mockMvc.perform(post("/mpbhms/ocr/auto-scan/off")
                        .with(csrf())
                        .with(user("test").roles("USER")))
                .andExpect(status().isOk())
                .andExpect(content().string("Auto scan DISABLED"));
    }

    @Test
    void testGetAutoScanStatus() throws Exception {
        when(scanner.isEnabled()).thenReturn(true);

        mockMvc.perform(get("/mpbhms/ocr/auto-scan/status")
                        .with(user("test").roles("USER")))
                .andExpect(status().isOk())
                .andExpect(content().string("Auto scan ON"));
    }

    @Test
    void testGetScanInterval() throws Exception {
        when(scanner.getInterval()).thenReturn(5000L);

        mockMvc.perform(get("/mpbhms/ocr/auto-scan/interval")
                        .with(user("test").roles("USER")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.intervalMs").value(5000));
    }

    @Test
    void testSetScanIntervalValid() throws Exception {
        mockMvc.perform(post("/mpbhms/ocr/auto-scan/interval")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"intervalMs\": 6000}")
                        .with(csrf())
                        .with(user("test").roles("USER")))
                .andExpect(status().isOk())
                .andExpect(content().string("Scan interval updated to 6000ms"));
    }

    @Test
    void testSetScanIntervalInvalid() throws Exception {
        mockMvc.perform(post("/mpbhms/ocr/auto-scan/interval")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"intervalMs\": -1}")
                        .with(csrf())
                        .with(user("test").roles("USER")))
                .andExpect(status().isBadRequest())
                .andExpect(content().string("Invalid interval"));
    }

    @Test
    void testGetScanLogsWithoutRoomId() throws Exception {
        Page<ScanLog> page = new PageImpl<>(List.of(new ScanLog()), PageRequest.of(0, 10), 1);
        when(scanLogService.getScanLogs(any())).thenReturn(page);

        mockMvc.perform(get("/mpbhms/ocr/scan-logs?page=0&size=10")
                        .with(user("test").roles("USER")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content").isArray());
    }

    @Test
    void testGetCurrentScanning() throws Exception {
        when(scanner.getCurrentScanningFile()).thenReturn("Room101/image1.jpg");

        mockMvc.perform(get("/mpbhms/ocr/current-scanning")
                        .with(user("test").roles("USER")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.current").value("Room101/image1.jpg"));
    }

    @Test
    void testOcrCccdSuccess() throws Exception {
        MockMultipartFile front = new MockMultipartFile("front", "front.jpg", "image/jpeg", "front".getBytes());
        MockMultipartFile back = new MockMultipartFile("back", "back.jpg", "image/jpeg", "back".getBytes());

        when(ocrCccdService.ocrCccd(any(), any()))
                .thenReturn(Map.of("name", "Nguyen Van A", "dob", "2000-01-01"));

        mockMvc.perform(multipart("/mpbhms/ocr/cccd")
                        .file(front).file(back)
                        .with(csrf())
                        .with(user("test").roles("USER")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.name").value("Nguyen Van A"))
                .andExpect(jsonPath("$.data.dob").value("2000-01-01"));
    }

    @Test
    void testOcrCccdFail() throws Exception {
        MockMultipartFile front = new MockMultipartFile("front", "front.jpg", "image/jpeg", "front".getBytes());
        MockMultipartFile back = new MockMultipartFile("back", "back.jpg", "image/jpeg", "back".getBytes());

        when(ocrCccdService.ocrCccd(any(), any()))
                .thenThrow(new RuntimeException("OCR failed"));

        mockMvc.perform(multipart("/mpbhms/ocr/cccd")
                        .file(front).file(back)
                        .with(csrf())
                        .with(user("test").roles("USER")))
                .andExpect(status().isBadRequest())
                .andExpect(content().string(org.hamcrest.Matchers.containsString("Error processing CCCD")));
    }
}
