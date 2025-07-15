package com.mpbhms.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDate;
import java.time.Instant;

@Entity
@Table(name = "room_services")
@Data
public class RoomServiceMapping {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "roomid")
    private Room room;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "serviceid")
    private CustomService service;

    @Column(name = "is_active")
    private Boolean isActive = true;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Column(name = "created_date")
    private Instant createdDate = Instant.now();

    @Column(name = "note")
    private String note;
} 