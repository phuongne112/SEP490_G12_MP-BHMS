package com.mpbhms.backend.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.mpbhms.backend.enums.AssetStatus;
import jakarta.persistence.*;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.math.BigDecimal;

@Entity
@Data
@EqualsAndHashCode(callSuper = false)
@Table(name = "assets")
public class Asset extends BaseEntity {

    // FK đến RoomEntity
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_id", nullable = true)
    @JsonIgnoreProperties("assets")
    private Room room;

    private String assetName;

    @Column(precision = 10, scale = 2)
    private BigDecimal quantity;

    @Column(columnDefinition = "TEXT")
    private String conditionNote;

    private String assetImage;



}
