package com.mpbhms.backend.controller;

import com.mpbhms.backend.entity.Contract;
import com.mpbhms.backend.service.ContractService;
import com.mpbhms.backend.util.ApiMessage;
import com.turkraft.springfilter.boot.Filter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.mpbhms.backend.dto.ContractDTO;
import com.mpbhms.backend.dto.ResultPaginationDTO;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import com.mpbhms.backend.util.SecurityUtil;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;

@RestController
@RequestMapping("/mpbhms/contracts")
@RequiredArgsConstructor
public class ContractController {

    private final ContractService contractService;

    // ✅ Xuất hợp đồng thành file PDF
    @GetMapping("/{id}/export")
    public ResponseEntity<byte[]> exportContractPdf(@PathVariable Long id, @RequestParam(required = false) Long templateId) {
        byte[] pdfBytes = contractService.generateContractPdf(id, templateId);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=contract_" + id + ".pdf")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdfBytes);
    }

    @GetMapping
    @ApiMessage("Get all contracts with filters and pagination")
    public ResponseEntity<ResultPaginationDTO> getAllContracts(
            @Filter Specification<Contract> spec,
            Pageable pageable
    ) {
        return ResponseEntity.ok(contractService.getAllContracts(spec, pageable));
    }

    @GetMapping("/by-room")
    public ResponseEntity<List<ContractDTO>> getContractsByRoomId(@RequestParam Long roomId) {
        return ResponseEntity.ok(contractService.getContractsByRoomId(roomId));
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

    @GetMapping("/test-update-user-info")
    public ResponseEntity<?> testUpdateUserInfo() {
        try {
            contractService.updateUserInfoMonthly();
            return ResponseEntity.ok("Đã cập nhật thông tin user thành công!");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Lỗi: " + e.getMessage());
        }
    }

    @GetMapping("/my-contracts")
    public ResponseEntity<?> getMyContracts() {
        Long userId = SecurityUtil.getCurrentUserId();
        java.util.List<com.mpbhms.backend.dto.ContractDTO> contracts = contractService.getContractsByRenterId(userId);
        return ResponseEntity.ok(contracts);
    }

    @GetMapping("/room/{roomId}/history")
    public ResponseEntity<?> getContractHistoryByRoom(@PathVariable Long roomId) {
        java.util.List<ContractDTO> contracts = contractService.getContractsByRoomId(roomId);
        return ResponseEntity.ok(contracts);
    }
}
