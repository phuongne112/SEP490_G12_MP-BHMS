package com.mpbhms.backend.service;

import com.mpbhms.backend.dto.ContractDTO;
import com.mpbhms.backend.dto.ResultPaginationDTO;
import com.mpbhms.backend.entity.Contract;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

// ContractService.java
public interface ContractService {
    byte[] generateContractPdf(Long contractId, Long templateId);

    ResultPaginationDTO getAllContracts(Specification<Contract> spec, Pageable pageable);
    ContractDTO updateContract(ContractDTO contractDTO);
    void deleteContract(Long id);
    ContractDTO createContract(ContractDTO contractDTO);
    
    // Method để test cập nhật thông tin user
    void updateUserInfoMonthly();

    /**
     * Xử lý tất cả hợp đồng đã hết hạn
     * - Đánh dấu hợp đồng là EXPIRED
     * - Cập nhật trạng thái phòng
     * - Gửi thông báo cho người thuê
     */
    void processExpiredContracts();
    
    /**
     * Gia hạn hợp đồng
     */
    void renewContract(Long contractId, java.time.Instant newEndDate);
    
    /**
     * Lấy danh sách hợp đồng sắp hết hạn (trong vòng 30 ngày)
     */
    ResultPaginationDTO getExpiringContracts(Pageable pageable);
    
    /**
     * Cập nhật hợp đồng (tăng giá, thay đổi điều khoản, v.v.)
     */
    void updateContract(com.mpbhms.backend.dto.UpdateContractRequest request);
    
    /**
     * Phê duyệt amendment
     */
    void approveAmendment(Long amendmentId, Boolean isLandlordApproval);
    
    /**
     * Từ chối amendment
     */
    void rejectAmendment(Long amendmentId, String reason);
    
    /**
     * Lấy lịch sử thay đổi hợp đồng
     */
    java.util.List<com.mpbhms.backend.entity.ContractAmendment> getContractAmendments(Long contractId);

    java.util.List<com.mpbhms.backend.dto.ContractDTO> getContractsByRenterId(Long renterId);

    void terminateContract(Long contractId);

    java.util.List<com.mpbhms.backend.dto.ContractDTO> getContractsByRoomId(Long roomId);

    void requestTerminateContract(Long contractId, String reason);
}

