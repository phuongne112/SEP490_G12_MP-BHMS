package com.mpbhms.backend.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import java.time.Instant;

@Entity
@Table(name = "contract_terms")
@Getter
@Setter
public class ContractTerm {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "contract_id", nullable = false)
    private Contract contract;

    @NotBlank(message = "Nội dung điều khoản không được để trống")
    @Size(min = 10, max = 2000, message = "Điều khoản phải có độ dài từ 10 đến 2000 ký tự")
    @Lob
    @Column(name = "content", nullable = false)
    private String content;

    @Column(name = "term_order", nullable = false)
    private Integer termOrder = 1;

    @Column(name = "is_mandatory", nullable = false)
    private Boolean isMandatory = false;

    @Column(name = "term_category")
    @Enumerated(EnumType.STRING)
    private TermCategory termCategory = TermCategory.GENERAL;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    @Column(name = "created_by")
    private String createdBy;

    @Column(name = "updated_by")
    private String updatedBy;

    @PrePersist
    protected void onCreate() {
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
        if (this.termOrder == null) {
            this.termOrder = 1;
        }
        if (this.isMandatory == null) {
            this.isMandatory = false;
        }
        if (this.isActive == null) {
            this.isActive = true;
        }
        if (this.termCategory == null) {
            this.termCategory = TermCategory.GENERAL;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = Instant.now();
    }

    public enum TermCategory {
        PAYMENT("Thanh toán"),
        USAGE("Sử dụng phòng"),
        MAINTENANCE("Bảo trì"),
        SECURITY("An ninh"),
        UTILITIES("Tiện ích"),
        TERMINATION("Chấm dứt hợp đồng"),
        GENERAL("Điều khoản chung"),
        SPECIAL("Điều khoản đặc biệt");

        private final String displayName;

        TermCategory(String displayName) {
            this.displayName = displayName;
        }

        public String getDisplayName() {
            return displayName;
        }
    }
} 