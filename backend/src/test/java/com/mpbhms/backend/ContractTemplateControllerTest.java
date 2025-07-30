package com.mpbhms.backend;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mpbhms.backend.controller.ContractTemplateController;
import com.mpbhms.backend.entity.ContractTemplate;
import com.mpbhms.backend.service.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.security.servlet.SecurityAutoConfiguration;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = ContractTemplateController.class, excludeAutoConfiguration = {SecurityAutoConfiguration.class})
public class ContractTemplateControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean private ContractTemplateService contractTemplateService;
    @MockBean private UserService userService;
    @MockBean private RoleService roleService;
    @MockBean private PermissionService permissionService;
    @MockBean private NotificationService notificationService;

    @Autowired
    private ObjectMapper objectMapper;

    private ContractTemplate sampleTemplate;

    @BeforeEach
    void setup() {
        sampleTemplate = new ContractTemplate();
        sampleTemplate.setId(1L);
        sampleTemplate.setLandlordId(100L);
        sampleTemplate.setName("Test Template");
        sampleTemplate.setContent("Test Content");
        sampleTemplate.setIsDefault(false);
    }

    @Test
    void testGetAllTemplates() throws Exception {
        when(contractTemplateService.getAllTemplatesForLandlord(100L)).thenReturn(List.of(sampleTemplate));

        mockMvc.perform(get("/mpbhms/contract-templates")
                        .param("landlordId", "100"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].id").value(1L));
    }

    @Test
    void testGetById() throws Exception {
        when(contractTemplateService.getAllTemplatesForLandlord(1L)).thenReturn(List.of(sampleTemplate));

        mockMvc.perform(get("/mpbhms/contract-templates/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(1L));
    }

    @Test
    void testCreateOrUpdateTemplate() throws Exception {
        when(contractTemplateService.createOrUpdateTemplate(any(ContractTemplate.class)))
                .thenReturn(sampleTemplate);

        mockMvc.perform(post("/mpbhms/contract-templates")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(sampleTemplate)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(1L));
    }

    @Test
    void testDeleteTemplate() throws Exception {
        doNothing().when(contractTemplateService).deleteTemplate(1L);

        mockMvc.perform(delete("/mpbhms/contract-templates/1"))
                .andExpect(status().isNoContent());
    }

    @Test
    void testSetDefaultTemplate() throws Exception {
        ContractTemplate t1 = new ContractTemplate();
        t1.setId(1L);
        t1.setLandlordId(100L);
        t1.setIsDefault(true);

        ContractTemplate t2 = new ContractTemplate();
        t2.setId(2L);
        t2.setLandlordId(100L);
        t2.setIsDefault(false);

        List<ContractTemplate> templates = List.of(t1, t2);
        when(contractTemplateService.getAllTemplatesForLandlord(100L)).thenReturn(templates);
        when(contractTemplateService.createOrUpdateTemplate(any(ContractTemplate.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        mockMvc.perform(post("/mpbhms/contract-templates/2/set-default")
                        .param("landlordId", "100"))
                .andExpect(status().isOk());

        ArgumentCaptor<ContractTemplate> captor = ArgumentCaptor.forClass(ContractTemplate.class);
        verify(contractTemplateService, times(2)).createOrUpdateTemplate(captor.capture());

        List<ContractTemplate> updatedTemplates = captor.getAllValues();
        assertThat(updatedTemplates).hasSize(2);

        for (ContractTemplate t : updatedTemplates) {
            if (t.getId().equals(2L)) {
                assertThat(t.getIsDefault()).isTrue();
            } else {
                assertThat(t.getIsDefault()).isFalse();
            }
        }
    }
}
