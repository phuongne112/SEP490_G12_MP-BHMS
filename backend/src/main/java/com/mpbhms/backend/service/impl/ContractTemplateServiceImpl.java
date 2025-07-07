package com.mpbhms.backend.service.impl;

import com.mpbhms.backend.entity.ContractTemplate;
import com.mpbhms.backend.repository.ContractTemplateRepository;
import com.mpbhms.backend.service.ContractTemplateService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ContractTemplateServiceImpl implements ContractTemplateService {
    private final ContractTemplateRepository contractTemplateRepository;

    @Override
    public ContractTemplate getTemplateForLandlord(Long landlordId, Long templateId) {
        if (templateId != null) {
            return contractTemplateRepository.findById(templateId)
                    .filter(t -> t.getLandlordId().equals(landlordId))
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy template hợp đồng!"));
        }
        return getDefaultTemplateForLandlord(landlordId);
    }

    @Override
    public ContractTemplate getDefaultTemplateForLandlord(Long landlordId) {
        ContractTemplate template = contractTemplateRepository.findByLandlordIdAndIsDefaultTrue(landlordId);
        if (template == null) throw new RuntimeException("Chủ trọ chưa có mẫu hợp đồng mặc định!");
        return template;
    }

    @Override
    public List<ContractTemplate> getAllTemplatesForLandlord(Long landlordId) {
        return contractTemplateRepository.findByLandlordId(landlordId);
    }

    @Override
    public ContractTemplate createOrUpdateTemplate(ContractTemplate template) {
        return contractTemplateRepository.save(template);
    }

    @Override
    public void deleteTemplate(Long id) {
        contractTemplateRepository.deleteById(id);
    }
} 