package com.mpbhms.backend.service;

import com.mpbhms.backend.entity.ContractTemplate;
import java.util.List;

public interface ContractTemplateService {
    ContractTemplate getTemplateForLandlord(Long landlordId, Long templateId);
    ContractTemplate getDefaultTemplateForLandlord(Long landlordId);
    List<ContractTemplate> getAllTemplatesForLandlord(Long landlordId);
    ContractTemplate createOrUpdateTemplate(ContractTemplate template);
    void deleteTemplate(Long id);
} 