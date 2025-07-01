package com.mpbhms.backend.controller;

import com.mpbhms.backend.dto.AddUsersToRoomRequest;
import com.mpbhms.backend.dto.ResultPaginationDTO;
import com.mpbhms.backend.service.RoomUserService;
import com.mpbhms.backend.service.ContractService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.mpbhms.backend.entity.ApiResponse;
import com.mpbhms.backend.exception.BusinessException;
import com.mpbhms.backend.dto.ContractAmendmentDTO;

import java.time.Instant;
import java.time.format.DateTimeParseException;
import java.util.Map;

@RestController
@RequestMapping("/mpbhms/room-users")
@RequiredArgsConstructor
public class RoomUserController {

    private final RoomUserService roomUserService;
    private final ContractService contractService;

    @PostMapping("/add-many")
    public ResponseEntity<?> addUsersToRoom(@RequestBody AddUsersToRoomRequest request) {
        try {
            roomUserService.addUsersToRoom(request);
            return ResponseEntity.ok("Đã thêm người dùng và tạo hợp đồng thành công.");
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Có lỗi xảy ra: " + e.getMessage());
        }
    }

    @PostMapping("/leave/{roomUserId}")
    public ResponseEntity<?> leaveRoom(@PathVariable Long roomUserId) {
        try {
            roomUserService.leaveRoom(roomUserId);
            return ResponseEntity.ok("Đã rời phòng thành công.");
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Có lỗi xảy ra: " + e.getMessage());
        }
    }
    
    /**
     * Xử lý hợp đồng hết hạn (manual trigger)
     */
    @PostMapping("/process-expired-contracts")
    public ResponseEntity<ApiResponse<?>> processExpiredContracts() {
        contractService.processExpiredContracts();
        return ResponseEntity.ok(new ApiResponse<>(200, null, "Đã xử lý tất cả hợp đồng hết hạn.", null));
    }
    
    /**
     * Gia hạn hợp đồng
     */
    @PostMapping("/renew-contract/{contractId}")
    public ResponseEntity<ApiResponse<?>> renewContract(
            @PathVariable Long contractId,
            @RequestBody Map<String, String> request) {

        String newEndDateStr = request.get("newEndDate");

        if (newEndDateStr == null || newEndDateStr.isEmpty()) {
            throw new BusinessException("Thiếu ngày kết thúc mới", HttpStatus.BAD_REQUEST, "MISSING_END_DATE");
        }

        try {
            Instant newEndDate = Instant.parse(newEndDateStr); // Đảm bảo định dạng ISO-8601 (ex: 2025-12-31T17:00:00Z)
            contractService.renewContract(contractId, newEndDate);
            return ResponseEntity.ok(new ApiResponse<>(200, null, "Đã gia hạn hợp đồng thành công.", null));
        } catch (DateTimeParseException e) {
            throw new BusinessException("Định dạng ngày không hợp lệ", HttpStatus.BAD_REQUEST, "INVALID_DATE_FORMAT");
        }
    }

    
    /**
     * Lấy danh sách hợp đồng sắp hết hạn
     */
    @GetMapping("/expiring-contracts")
    public ResponseEntity<ResultPaginationDTO> getExpiringContracts(Pageable pageable) {
        try {
            ResultPaginationDTO result = contractService.getExpiringContracts(pageable);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }
    
    /**
     * Cập nhật hợp đồng (tăng giá, thay đổi điều khoản)
     */
    @PostMapping("/update-contract")
    public ResponseEntity<ApiResponse<?>> updateContract(@RequestBody com.mpbhms.backend.dto.UpdateContractRequest request) {
        contractService.updateContract(request);
        return ResponseEntity.ok(new ApiResponse<>(200, null, "Đã tạo yêu cầu cập nhật hợp đồng thành công.", null));
    }
    
    /**
     * Phê duyệt amendment
     */
    @PostMapping("/approve-amendment/{amendmentId}")
    public ResponseEntity<ApiResponse<?>> approveAmendment(
            @PathVariable Long amendmentId,
            @RequestBody java.util.Map<String, Boolean> request) {
        Boolean isLandlordApproval = request.get("isLandlordApproval");
        contractService.approveAmendment(amendmentId, isLandlordApproval);
        return ResponseEntity.ok(new ApiResponse<>(200, null, "Đã phê duyệt thay đổi hợp đồng.", null));
    }
    
    /**
     * Từ chối amendment
     */
    @PostMapping("/reject-amendment/{amendmentId}")
    public ResponseEntity<ApiResponse<?>> rejectAmendment(
            @PathVariable Long amendmentId,
            @RequestBody java.util.Map<String, String> request) {
        String reason = request.get("reason");
        contractService.rejectAmendment(amendmentId, reason);
        return ResponseEntity.ok(new ApiResponse<>(200, null, "Đã từ chối thay đổi hợp đồng.", null));
    }
    
    /**
     * Lấy lịch sử thay đổi hợp đồng
     */
    @GetMapping("/contract-amendments/{contractId}")
    public ResponseEntity<?> getContractAmendments(@PathVariable Long contractId) {
        try {
            java.util.List<com.mpbhms.backend.entity.ContractAmendment> amendments = 
                contractService.getContractAmendments(contractId);
            java.util.List<ContractAmendmentDTO> dtos = amendments.stream().map(am -> {
                ContractAmendmentDTO dto = new ContractAmendmentDTO();
                dto.setId(am.getId());
                dto.setAmendmentType(am.getAmendmentType() != null ? am.getAmendmentType().name() : null);
                dto.setOldValue(am.getOldValue());
                dto.setNewValue(am.getNewValue());
                dto.setReason(am.getReason());
                dto.setStatus(am.getStatus() != null ? am.getStatus().name() : null);
                dto.setApprovedByLandlord(am.getApprovedByLandlord());
                dto.setApprovedByTenants(am.getApprovedByTenants());
                dto.setCreatedDate(am.getCreatedDate());
                dto.setPendingApprovals(am.getPendingApprovals());
                dto.setApprovedBy(am.getApprovedBy());
                return dto;
            }).toList();
            return ResponseEntity.ok(dtos);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Có lỗi xảy ra: " + e.getMessage());
        }
    }

    @PostMapping("/terminate-contract/{contractId}")
    public ResponseEntity<ApiResponse<?>> terminateContract(@PathVariable Long contractId) {
        contractService.terminateContract(contractId);
        return ResponseEntity.ok(new ApiResponse<>(200, null, "Đã kết thúc hợp đồng.", null));
    }
}
