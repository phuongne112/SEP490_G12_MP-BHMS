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
import com.mpbhms.backend.entity.Room;
import java.util.stream.Collectors;

import java.time.Instant;
import java.time.format.DateTimeParseException;
import java.util.Map;
import com.mpbhms.backend.entity.RoomUser;
import com.mpbhms.backend.entity.UserInfo;
import com.mpbhms.backend.entity.CustomService;
import com.mpbhms.backend.entity.Asset;
import com.mpbhms.backend.entity.Contract;
import com.mpbhms.backend.enums.RoomStatus;
import com.mpbhms.backend.repository.UserRepository;
import com.mpbhms.backend.repository.RoomUserRepository;
import com.mpbhms.backend.service.AmendmentAutoApproveJob;
import org.springframework.beans.factory.annotation.Autowired;
import com.mpbhms.backend.entity.User;

@RestController
@RequestMapping("/mpbhms/room-users")
@RequiredArgsConstructor
public class RoomUserController {

    private final RoomUserService roomUserService;
    private final ContractService contractService;
    private final UserRepository userRepository;
    private final RoomUserRepository roomUserRepository;
    private final AmendmentAutoApproveJob amendmentAutoApproveJob;

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
        String reason = request.getOrDefault("reason", "");

        if (newEndDateStr == null || newEndDateStr.isEmpty()) {
            throw new BusinessException("Thiếu ngày kết thúc mới", HttpStatus.BAD_REQUEST, "MISSING_END_DATE");
        }

        try {
            Instant newEndDate = Instant.parse(newEndDateStr);
            // Lấy userId từ username hiện tại
            Long userId = null;
            String username = com.mpbhms.backend.util.CurrentUserUtil.getCurrentUserLogin().orElse(null);
            if (username != null) {
                com.mpbhms.backend.entity.User user = userRepository.findByUsername(username);
                if (user != null) userId = user.getId();
            }
            contractService.requestRenewalAmendment(contractId, newEndDate, reason, userId);
            return ResponseEntity.ok(new ApiResponse<>(200, null, "Đã gửi yêu cầu gia hạn hợp đồng, chờ duyệt.", null));
        } catch (DateTimeParseException e) {
            throw new BusinessException("Định dạng ngày không hợp lệ", HttpStatus.BAD_REQUEST, "INVALID_DATE_FORMAT");
        } catch (RuntimeException e) {
            throw new BusinessException(e.getMessage(), HttpStatus.BAD_REQUEST, "RENEWAL_ERROR");
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
                dto.setRejectedBy(am.getRejectedBy()); // Bổ sung rejectedBy
                return dto;
            }).toList();
            return ResponseEntity.ok(dtos);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Có lỗi xảy ra: " + e.getMessage());
        }
    }

    /**
     * Lấy lịch sử thay đổi hợp đồng theo status
     */
    @GetMapping("/contract-amendments/{contractId}/status/{status}")
    public ResponseEntity<?> getContractAmendmentsByStatus(@PathVariable Long contractId, @PathVariable String status) {
        try {
            java.util.List<com.mpbhms.backend.entity.ContractAmendment> amendments = 
                contractService.getContractAmendmentsByStatus(contractId, status);
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
                dto.setRejectedBy(am.getRejectedBy());
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

    @PostMapping("/request-terminate-contract/{contractId}")
    public ResponseEntity<ApiResponse<?>> requestTerminateContract(
            @PathVariable Long contractId,
            @RequestBody java.util.Map<String, String> request) {
        String reason = request.get("reason");
        contractService.requestTerminateContract(contractId, reason);
        return ResponseEntity.ok(new ApiResponse<>(200, null, "Đã gửi yêu cầu kết thúc hợp đồng.", null));
    }

    /**
     * API: Lấy thông tin phòng hiện tại của người thuê (chi tiết)
     */
    @GetMapping("/my-room")
    public ResponseEntity<?> getMyRoom() {
        try {
            java.util.Map<String, Object> dto = roomUserService.getCurrentRenterRoomDetail();
            return ResponseEntity.ok(dto);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("Lỗi khi lấy thông tin phòng: " + e.getMessage());
        }
    }

    /**
     * Test trigger thủ công job auto-approve amendment (chỉ dùng cho test)
     */
    @PostMapping("/test-auto-approve-amendments")
    public ResponseEntity<ApiResponse<?>> testAutoApproveAmendments() {
        try {
            // Gọi trực tiếp method auto-approve
            amendmentAutoApproveJob.autoApproveExpiredAmendments();
            return ResponseEntity.ok(new ApiResponse<>(200, null, "Đã chạy job auto-approve amendments thành công.", null));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new ApiResponse<>(400, null, "Lỗi: " + e.getMessage(), null));
        }
    }
}
