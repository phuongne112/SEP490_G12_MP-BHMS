package com.mpbhms.backend.entity;

import com.mpbhms.backend.enums.ScheduleStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.Instant;

@Entity
@Table(name = "schedules")
@Getter
@Setter
public class Schedule {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "room_id")
    private Room room;

    @ManyToOne
    @JoinColumn(name = "renter_id", nullable = true)
    private User renter; // Optional

    private String fullName;
    private String phone;
    private String email;

    private Instant appointmentTime;

    private String note;

    @Enumerated(EnumType.STRING)
    private ScheduleStatus status;
} 