package com.mpbhms.backend.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import com.mpbhms.backend.enums.RoomStatus;
import jakarta.persistence.*;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Data
@EqualsAndHashCode(callSuper = true)
@Table(name = "Rooms")
public class Room extends BaseEntity {

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

    @Column(length = 255)
    private String scanFolder;

    @OneToMany(mappedBy = "room", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<RoomUser> roomUsers = new ArrayList<>();

    // Thay thế RoomServiceLink bằng RoomServiceMapping
    @OneToMany(mappedBy = "room", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<RoomServiceMapping> serviceMappings = new ArrayList<>();

    // Quan hệ cũ giữ lại để không lỗi, sẽ migrate dần
    @ManyToMany
    @JoinTable(
            name = "room_services",
            joinColumns = @JoinColumn(name = "roomid"),
            inverseJoinColumns = @JoinColumn(name = "serviceid")
    )
    private List<CustomService> services;

    @OneToMany(mappedBy = "room", cascade = CascadeType.ALL, fetch = FetchType.LAZY, orphanRemoval = true)
    @JsonManagedReference
    private List<RoomImage> images = new ArrayList<>();

    @OneToMany(mappedBy = "room", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JsonManagedReference
    private List<Asset> assets = new ArrayList<>();

    @Column(name = "max_occupants")
    private Integer maxOccupants;

    // ✅ Quan hệ với landlord (chủ trọ)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "landlord_id")
    @JsonIgnoreProperties({"userInfo", "password", "role", "refreshToken"})
    private User landlord;
    //
    @OneToMany(mappedBy = "room", cascade = CascadeType.ALL)
    private List<ServiceReading> serviceReadings = new ArrayList<>();

    @Column(length = 100)
    private String building;

    @Column(name = "deleted", nullable = false)
    private Boolean deleted = false;
}
