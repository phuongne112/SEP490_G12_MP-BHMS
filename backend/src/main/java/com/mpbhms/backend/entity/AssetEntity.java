package com.mpbhms.backend.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Data
@EqualsAndHashCode(callSuper = false)
@Table(name = "assets")
public class AssetEntity extends BaseEntity {

    // FK đến RoomEntity
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_id", nullable = false)
    @JsonIgnoreProperties("assets") // nếu bạn muốn tránh vòng lặp
    private RoomEntity room;

    private String assetName;

    @Column(precision = 10, scale = 2)
    private BigDecimal quantity;

    @Column(columnDefinition = "TEXT")
    private String conditionNote;

    @Enumerated(EnumType.STRING)
    private AssetStatus assetStatus;

    private String assetImage;


    // ===== Enum for AssetStatus =====
    public enum AssetStatus {
        Good,
        Damaged,
        Lost,
        Maintenance
    }
}
