package com.mpbhms.backend.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import com.mpbhms.backend.enums.RoomStatus;
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

    @OneToMany(mappedBy = "room", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<RoomUser> roomUsers = new ArrayList<>();


    @ManyToMany
    @JoinTable(
            name = "room_services",
            joinColumns = @JoinColumn(name = "RoomID"),
            inverseJoinColumns = @JoinColumn(name = "ServiceID")
    )
    private List<Service> services;

    @OneToMany(mappedBy = "room", cascade = CascadeType.ALL, fetch = FetchType.LAZY, orphanRemoval = true)
    @JsonManagedReference
    private List<RoomImage> images = new ArrayList<>();

    @OneToMany(mappedBy = "room", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JsonManagedReference
    private List<Asset> assets = new ArrayList<>();


}
