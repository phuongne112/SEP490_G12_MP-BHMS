
package com.mpbhms.backend;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mpbhms.backend.config.PermissionInterceptor;
import com.mpbhms.backend.controller.ScheduleController;
import com.mpbhms.backend.dto.CreateScheduleRequest;
import com.mpbhms.backend.dto.ScheduleDTO;
import com.mpbhms.backend.dto.ResultPaginationDTO;
import com.mpbhms.backend.enums.ScheduleStatus;
import com.mpbhms.backend.service.ScheduleService;
import com.mpbhms.backend.service.UserService;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
@AutoConfigureMockMvc(addFilters = false)
@Import(PermissionInterceptor.class)
@WebMvcTest(ScheduleController.class)
public class ScheduleControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ScheduleService scheduleService;
    @MockBean
    private UserService userService;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    public void testCreateSchedule() throws Exception {
        CreateScheduleRequest request = new CreateScheduleRequest();
        ScheduleDTO scheduleDTO = new ScheduleDTO();
        Mockito.when(scheduleService.createSchedule(any())).thenReturn(scheduleDTO);

        mockMvc.perform(post("/mpbhms/schedules")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());
    }

    @Test
    public void testGetAllSchedules() throws Exception {
        Mockito.when(scheduleService.searchAndFilter(any(), any(), any(), any(), any(), anyInt(), anyInt()))
                .thenReturn(new ResultPaginationDTO());

        mockMvc.perform(get("/mpbhms/schedules"))
                .andExpect(status().isOk());
    }

    @Test
    public void testGetSchedulesForLandlord() throws Exception {
        Mockito.when(scheduleService.getSchedulesByLandlord(anyLong())).thenReturn(List.of());

        mockMvc.perform(get("/mpbhms/schedules/landlord")
                        .param("landlordId", "1"))
                .andExpect(status().isOk());
    }

    @Test
    public void testGetSchedule() throws Exception {
        Mockito.when(scheduleService.getSchedule(anyLong())).thenReturn(new ScheduleDTO());

        mockMvc.perform(get("/mpbhms/schedules/1"))
                .andExpect(status().isOk());
    }

    @Test
    public void testUpdateStatus() throws Exception {
        Mockito.when(scheduleService.updateStatus(anyLong(), any())).thenReturn(new ScheduleDTO());

        mockMvc.perform(patch("/mpbhms/schedules/1/status")
                        .param("status", "COMPLETED"))
                .andExpect(status().isOk());
    }

    @Test
    public void testUpdateSchedule() throws Exception {
        CreateScheduleRequest request = new CreateScheduleRequest();
        Mockito.when(scheduleService.updateSchedule(anyLong(), any())).thenReturn(new ScheduleDTO());

        mockMvc.perform(put("/mpbhms/schedules/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());
    }

    @Test
    public void testDeleteSchedule() throws Exception {
        mockMvc.perform(delete("/mpbhms/schedules/1"))
                .andExpect(status().isNoContent());
    }

    @Test
    public void testGetMySchedulesByRenterId() throws Exception {
        Mockito.when(scheduleService.getSchedulesByRenter(anyLong())).thenReturn(List.of());

        mockMvc.perform(get("/mpbhms/schedules/my")
                        .param("renterId", "1"))
                .andExpect(status().isOk());
    }

    @Test
    public void testGetMySchedulesByEmail() throws Exception {
        Mockito.when(scheduleService.getSchedulesByEmail(anyString())).thenReturn(List.of());

        mockMvc.perform(get("/mpbhms/schedules/my")
                        .param("email", "test@example.com"))
                .andExpect(status().isOk());
    }

    @Test
    public void testGetMySchedulesBadRequest() throws Exception {
        mockMvc.perform(get("/mpbhms/schedules/my"))
                .andExpect(status().isBadRequest());
    }
}
