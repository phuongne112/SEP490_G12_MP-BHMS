package com.mpbhms.backend.controller;

import com.mpbhms.backend.service.ContractService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.mpbhms.backend.dto.ContractDTO;
import com.mpbhms.backend.dto.ResultPaginationDTO;
import com.turkraft.springfilter.boot.Filter;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

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

    // Lấy danh sách hợp đồng (filter + page)
    @GetMapping
    public ResponseEntity<ResultPaginationDTO> getAllContracts(
            @Filter Specification spec,
            Pageable pageable
    ) {
        return ResponseEntity.ok(contractService.getAllContracts(spec, pageable));
    }

    // Tạo hợp đồng mới
    @PostMapping
    public ResponseEntity<ContractDTO> createContract(@RequestBody ContractDTO contractDTO) {
        return ResponseEntity.ok(contractService.createContract(contractDTO));
    }

    // Cập nhật hợp đồng
    @PutMapping
    public ResponseEntity<ContractDTO> updateContract(@RequestBody ContractDTO contractDTO) {
        return ResponseEntity.ok(contractService.updateContract(contractDTO));
    }

    // Xóa hợp đồng
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteContract(@PathVariable Long id) {
        contractService.deleteContract(id);
        return ResponseEntity.noContent().build();
    }
}
