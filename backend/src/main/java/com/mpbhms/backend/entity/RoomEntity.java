package com.mpbhms.backend.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Entity
@Data
@EqualsAndHashCode(callSuper = true)
@Table(name = "Rooms")
public class RoomEntity extends BaseEntity {

    @Column(nullable = false, unique = true, length = 10)
    private String roomNumber;

    @Column(precision = 10, scale = 2)
    private BigDecimal area;

    private Double pricePerMonth;

    @Enumerated(EnumType.STRING)
    private RoomStatus roomStatus;

    private Integer numberOfBedrooms;

    private Integer numberOfBathrooms;

    @Column(columnDefinition = "TEXT")
    private String description;

    private Boolean isActive = true;

    @ManyToMany(mappedBy = "rooms", fetch = FetchType.LAZY)
    @JsonIgnoreProperties("rooms")
    private List<UserEntity> users;


    @ManyToMany
    @JoinTable(
            name = "room_services",
            joinColumns = @JoinColumn(name = "RoomID"),
            inverseJoinColumns = @JoinColumn(name = "ServiceID")
    )
    private List<ServiceEntity> services;

    @OneToMany(mappedBy = "room", cascade = CascadeType.ALL, fetch = FetchType.LAZY, orphanRemoval = true)
    @JsonManagedReference
    private List<RoomImageEntity> images = new ArrayList<>();

    @OneToMany(mappedBy = "room", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JsonManagedReference
    private List<AssetEntity> assets = new ArrayList<>();

    // ===== Enum for RoomStatus =====
    public enum RoomStatus {
        Available,
        Occupied,
        Maintenance,
        Inactive
    }
}
