package com.mpbhms.backend.entity;

import com.mpbhms.backend.enums.ContractStatus;
import com.mpbhms.backend.enums.PaymentCycle;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "contracts")
@Getter
@Setter
public class Contract {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Quan hệ với Room
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_id", nullable = false)
    private Room room;

    // Quan hệ với RoomUser
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_user_id", nullable = false)
    private RoomUser roomUser;

    @Column(name = "contract_start_date", nullable = false)
    private LocalDateTime contractStartDate;

    @Column(name = "contract_end_date", nullable = false)
    private LocalDateTime contractEndDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "contract_status", nullable = false)
    private ContractStatus contractStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_cycle", nullable = false)
    private PaymentCycle paymentCycle;

    @Column(name = "deposit_amount", precision = 15, scale = 2)
    private BigDecimal depositAmount;

    @Column(name = "rent_amount", precision = 15, scale = 2)
    private BigDecimal rentAmount;

    @Lob
    @Column(name = "contract_image")
    private String contractImage;

    @Column(name = "created_by")
    private String createdBy;

    @Column(name = "created_date")
    private LocalDateTime createdDate;

    @Column(name = "updated_by")
    private String updatedBy;

    @Column(name = "updated_date")
    private LocalDateTime updatedDate;
}
