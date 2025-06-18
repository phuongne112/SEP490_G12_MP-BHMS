package com.mpbhms.backend.controller;

import com.mpbhms.backend.service.ContractService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/mpbhms/contracts")
@RequiredArgsConstructor
public class ContractController {

    private final ContractService contractService;

    // ✅ Xuất hợp đồng thành file PDF
    @GetMapping("/{id}/export")
    public ResponseEntity<byte[]> exportContractPdf(@PathVariable Long id) {
        byte[] pdfBytes = contractService.generateContractPdf(id);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=contract_" + id + ".pdf")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdfBytes);
    }
}
