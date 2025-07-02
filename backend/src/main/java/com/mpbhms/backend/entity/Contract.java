package com.mpbhms.backend.entity;

import com.mpbhms.backend.enums.ContractStatus;
import com.mpbhms.backend.enums.PaymentCycle;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDateTime;

@Entity
@Table(name = "contracts")
@Getter
@Setter
public class Contract extends BaseEntity {

    // Quan hệ với Room
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_id", nullable = false)
    private Room room;

    // Quan hệ với RoomUser (nhiều người thuê)
    @OneToMany(mappedBy = "contract", fetch = FetchType.LAZY)
    private java.util.List<RoomUser> roomUsers;

    @Column(name = "contract_start_date", nullable = false)
    private Instant contractStartDate;

    @Column(name = "contract_end_date", nullable = false)
    private Instant contractEndDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "contract_status", nullable = false)
    private ContractStatus contractStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_cycle", nullable = false)
    private PaymentCycle paymentCycle;

    @Column(name = "deposit_amount", precision = 15, scale = 2)
    private BigDecimal depositAmount;

    @Column(name = "rent_amount")
    private Double rentAmount;

    @Lob
    @Column(name = "contract_image")
    private String contractImage;

    @Column(name = "contract_number", unique = true, length = 32)
    private String contractNumber;

    @OneToMany(mappedBy = "contract", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private java.util.List<ContractTerm> terms;

    @OneToMany(mappedBy = "contract", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private java.util.List<ContractLandlordInfo> landlordInfos;

}
