package com.mpbhms.backend.controller;

import com.mpbhms.backend.entity.ContractTemplate;
import com.mpbhms.backend.service.ContractTemplateService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/mpbhms/contract-templates")
@RequiredArgsConstructor
public class ContractTemplateController {
    private final ContractTemplateService contractTemplateService;

    // Lấy tất cả template của landlord
    @GetMapping
    public ResponseEntity<List<ContractTemplate>> getAll(@RequestParam Long landlordId) {
        return ResponseEntity.ok(contractTemplateService.getAllTemplatesForLandlord(landlordId));
    }

    // Lấy template theo id
    @GetMapping("/{id}")
    public ResponseEntity<ContractTemplate> getById(@PathVariable Long id) {
        return ResponseEntity.ok(contractTemplateService.getAllTemplatesForLandlord(id).stream().findFirst().orElse(null));
    }

    // Tạo mới hoặc cập nhật template
    @PostMapping
    public ResponseEntity<ContractTemplate> createOrUpdate(@RequestBody ContractTemplate template) {
        return ResponseEntity.ok(contractTemplateService.createOrUpdateTemplate(template));
    }

    // Xóa template
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        contractTemplateService.deleteTemplate(id);
        return ResponseEntity.noContent().build();
    }

    // Đặt template mặc định
    @PostMapping("/{id}/set-default")
    public ResponseEntity<Void> setDefault(@PathVariable Long id, @RequestParam Long landlordId) {
        List<ContractTemplate> templates = contractTemplateService.getAllTemplatesForLandlord(landlordId);
        for (ContractTemplate t : templates) {
            t.setIsDefault(t.getId().equals(id));
            contractTemplateService.createOrUpdateTemplate(t);
        }
        return ResponseEntity.ok().build();
    }
} 