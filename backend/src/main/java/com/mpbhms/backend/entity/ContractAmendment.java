package com.mpbhms.backend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import jakarta.persistence.Convert;
import com.mpbhms.backend.util.JsonListStringConverter;

@Entity
@Table(name = "contract_amendments")
@Getter
@Setter
public class ContractAmendment extends BaseEntity {
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "contract_id", nullable = false)
    private Contract contract;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "amendment_type", nullable = false, length = 50)
    private AmendmentType amendmentType;
    
    @Column(name = "old_value", columnDefinition = "TEXT")
    private String oldValue;
    
    @Column(name = "new_value", columnDefinition = "TEXT")
    private String newValue;
    
    @Column(name = "reason", columnDefinition = "TEXT")
    private String reason;
    
    @Column(name = "effective_date")
    private Instant effectiveDate;
    
    @Column(name = "requires_approval")
    private Boolean requiresApproval = false;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    private AmendmentStatus status = AmendmentStatus.PENDING;
    
    @Column(name = "approved_by_landlord")
    private Boolean approvedByLandlord = false;
    
    @Column(name = "approved_by_tenants")
    private Boolean approvedByTenants = false;
    
    @Column(name = "pending_approvals", columnDefinition = "TEXT")
    @Convert(converter = com.mpbhms.backend.util.JsonListLongConverter.class)
    private List<Long> pendingApprovals;

    @Column(name = "approved_by", columnDefinition = "TEXT")
    @Convert(converter = com.mpbhms.backend.util.JsonListLongConverter.class)
    private List<Long> approvedBy;
    
    @Column(name = "new_rent_amount")
    private Double newRentAmount;

    @Column(name = "new_deposit_amount", precision = 15, scale = 2)
    private BigDecimal newDepositAmount;

    @Column(name = "new_end_date")
    private Instant newEndDate;

    @Column(name = "new_terms", columnDefinition = "TEXT")
    @Convert(converter = JsonListStringConverter.class)
    private java.util.List<String> newTerms;

    @Column(name = "new_renter_ids", columnDefinition = "TEXT")
    @Convert(converter = com.mpbhms.backend.util.JsonListLongConverter.class)
    private List<Long> newRenterIds;
    
    public enum AmendmentType {
        RENT_INCREASE,
        DEPOSIT_CHANGE,
        TERMS_UPDATE,
        DURATION_EXTENSION,
        RENTER_CHANGE,
        OTHER
    }
    
    public enum AmendmentStatus {
        PENDING,
        APPROVED,
        REJECTED,
        CANCELLED
    }
} 