package com.mpbhms.backend.dto;

import java.time.Instant;
import java.util.List;
import lombok.Data;

@Data
public class ContractAmendmentDTO {
    private Long id;
    private String amendmentType;
    private String oldValue;
    private String newValue;
    private String reason;
    private String status;
    private Boolean approvedByLandlord;
    private Boolean approvedByTenants;
    private Instant createdDate;
    private List<Long> pendingApprovals;
    private List<Long> approvedBy;
} 