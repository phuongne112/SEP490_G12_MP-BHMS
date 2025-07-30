package com.mpbhms.backend;

import com.mpbhms.backend.controller.ElectricMeterController;
import com.mpbhms.backend.entity.User;
import com.mpbhms.backend.service.ElectricMeterDetectionService;
import com.mpbhms.backend.service.UserService;
import com.mpbhms.backend.config.PermissionInterceptor;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = ElectricMeterController.class)
class ElectricMeterControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ElectricMeterDetectionService detectionService;

    @MockBean
    private UserService userService;

    // ✅ Mock interceptor để cho phép mọi request
    @MockBean
    private PermissionInterceptor permissionInterceptor;

    private MockMultipartFile mockFile;

    @BeforeEach
    void setup() throws Exception {
        mockFile = new MockMultipartFile(
                "file", "test.jpg", MediaType.IMAGE_JPEG_VALUE, "test image content".getBytes()
        );
        Mockito.when(userService.handleGetUserByUsername("test@example.com")).thenReturn(new User());
        Mockito.when(permissionInterceptor.preHandle(any(), any(), any())).thenReturn(true);
    }

    @Test
    @WithMockUser(username = "test@example.com", authorities = {"ocr:detect"})
    void testDetectAndReadSuccess() throws Exception {
        Mockito.when(detectionService.detectAndReadFromFile(any())).thenReturn("123456");

        mockMvc.perform(multipart("/mpbhms/ocr/detect-ocr")
                        .file(mockFile)
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(200))
                .andExpect(jsonPath("$.data.message").value("Thành công"))
                .andExpect(jsonPath("$.data.data").value("123456"));
    }

    @Test
    @WithMockUser(username = "test@example.com", authorities = {"ocr:detect"})
    void testDetectAndReadFail() throws Exception {
        Mockito.when(detectionService.detectAndReadFromFile(any())).thenReturn("File không hợp lệ");

        mockMvc.perform(multipart("/mpbhms/ocr/detect-ocr")
                        .file(mockFile)
                        .with(csrf()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").value("Có lỗi xảy ra khi xử lý ảnh"))
                .andExpect(jsonPath("$.data").value("File không hợp lệ")); // ✅ không phải $.data.message
    }


    @Test
    @WithMockUser(username = "test@example.com", authorities = {"ocr:detect"})
    void testDetectAndSaveSuccess() throws Exception {
        Mockito.when(detectionService.detectReadAndSaveImage(any(), eq(1L))).thenReturn("123456");

        mockMvc.perform(multipart("/mpbhms/ocr/detect-and-save")
                        .file(mockFile)
                        .param("roomId", "1")
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.message").value("Đã chụp và lưu ảnh thành công"));
    }

    @Test
    @WithMockUser(username = "test@example.com", authorities = {"ocr:detect"})
    void testSaveImageOnlySuccess() throws Exception {
        Mockito.doNothing().when(detectionService).saveImageToFileSystemOnly(any(), eq(1L));

        mockMvc.perform(multipart("/mpbhms/ocr/save-image-only")
                        .file(mockFile)
                        .param("roomId", "1")
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.message").value("Đã chụp và lưu ảnh thành công"));
    }

    @Test
    @WithMockUser(username = "test@example.com", authorities = {"ocr:detect"})
    void testSaveReading() throws Exception {
        Mockito.doNothing().when(detectionService).saveElectricReading("123456", 1L);

        mockMvc.perform(post("/mpbhms/ocr/save-reading")
                        .param("roomId", "1")
                        .param("value", "123456")
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.message").value("Lưu thành công"))
                .andExpect(jsonPath("$.data.data").value("123456"));
    }

}
