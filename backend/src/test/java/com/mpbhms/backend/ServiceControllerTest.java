package com.mpbhms.backend;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mpbhms.backend.controller.ServiceController;
import com.mpbhms.backend.dto.CreateServiceRequest;
import com.mpbhms.backend.dto.ResultPaginationDTO;
import com.mpbhms.backend.dto.ServiceDTO;
import com.mpbhms.backend.entity.CustomService;
import com.mpbhms.backend.entity.ServiceReading;
import com.mpbhms.backend.service.ServiceService;
import com.mpbhms.backend.repository.ServiceReadingRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.web.PageableHandlerMethodArgumentResolver;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.core.MethodParameter;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.ModelAndViewContainer;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import com.mpbhms.backend.enums.ServiceType;

@ExtendWith(MockitoExtension.class)
public class ServiceControllerTest {
    private MockMvc mockMvc;
    @Mock
    private ServiceService serviceService;
    @Mock
    private ServiceReadingRepository serviceReadingRepository;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        ServiceController controller = new ServiceController(serviceService);
        // Inject mock ServiceReadingRepository
        org.springframework.test.util.ReflectionTestUtils.setField(controller, "serviceReadingRepository",
                serviceReadingRepository);

        HandlerMethodArgumentResolver mockFilterResolver = new HandlerMethodArgumentResolver() {
            @Override
            public boolean supportsParameter(MethodParameter parameter) {
                return Specification.class.isAssignableFrom(parameter.getParameterType());
            }

            @Override
            public Object resolveArgument(MethodParameter parameter, ModelAndViewContainer mavContainer,
                    NativeWebRequest webRequest,
                    org.springframework.web.bind.support.WebDataBinderFactory binderFactory) {
                return (Specification<CustomService>) (root, query, cb) -> cb.conjunction();
            }
        };
        PageableHandlerMethodArgumentResolver pageableResolver = new PageableHandlerMethodArgumentResolver();
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setCustomArgumentResolvers(mockFilterResolver, pageableResolver)
                .build();
    }

    @Test
    public void testGetAllServices_Success() throws Exception {
        ResultPaginationDTO mockResult = new ResultPaginationDTO();
        mockResult.setResult(Collections.emptyList());
        when(serviceService.getAllServices(any(), any(Pageable.class))).thenReturn(mockResult);
        mockMvc.perform(get("/mpbhms/services")
                .param("page", "0")
                .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result").exists());
    }

    @Test
    public void testGetAllServicesList_Success() throws Exception {
        ServiceDTO dto = new ServiceDTO();
        dto.setId(1L);
        when(serviceService.getAllServices()).thenReturn(Collections.singletonList(dto));
        mockMvc.perform(get("/mpbhms/services/all"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(1L));
    }

    @Test
    public void testGetServiceById_Success() throws Exception {
        CustomService service = new CustomService();
        service.setId(1L);
        when(serviceService.getServiceById(1L)).thenReturn(service);
        mockMvc.perform(get("/mpbhms/services/{id}", 1L))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1L));
    }

    @Test
    public void testCreateService_Success() throws Exception {
        CreateServiceRequest request = new CreateServiceRequest();
        request.setServiceName("Water");
        request.setUnit("m3");
        request.setUnitPrice(BigDecimal.valueOf(10000));
        request.setServiceType(ServiceType.ELECTRICITY);
        CustomService created = new CustomService();
        created.setId(2L);
        when(serviceService.createService(any(CustomService.class))).thenReturn(created);
        mockMvc.perform(post("/mpbhms/services")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(2L));
    }

    @Test
    public void testUpdateService_Success() throws Exception {
        CreateServiceRequest request = new CreateServiceRequest();
        request.setServiceName("Electricity");
        request.setUnit("kWh");
        request.setUnitPrice(BigDecimal.valueOf(3000));
        request.setServiceType(ServiceType.ELECTRICITY);


        CustomService existing = new CustomService();
        existing.setId(3L);
        existing.setUnitPrice(BigDecimal.valueOf(2000));

        when(serviceService.getServiceById(3L)).thenReturn(existing);

        CustomService updated = new CustomService();
        updated.setId(3L);
        updated.setUnitPrice(BigDecimal.valueOf(3000));

        when(serviceService.updateService(any(CustomService.class))).thenReturn(updated);

        mockMvc.perform(put("/mpbhms/services/{id}", 3L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(3L));
    }


    @Test
    public void testDeleteService_Success() throws Exception {
        doNothing().when(serviceService).deleteService(4L);
        mockMvc.perform(delete("/mpbhms/services/{id}", 4L))
                .andExpect(status().isNoContent());
    }

    @Test
    public void testGetServiceReadingsByServiceId_Success() throws Exception {
        ServiceReading reading = new ServiceReading();
        reading.setId(10L);
        reading.setOldReading(BigDecimal.valueOf(1));
        reading.setNewReading(BigDecimal.valueOf(2));
        reading.setCreatedDate(Instant.now());
        when(serviceReadingRepository.findByService_Id(5L)).thenReturn(Collections.singletonList(reading));
        mockMvc.perform(get("/mpbhms/services/readings")
                .param("serviceId", "5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(10L));
    }
}