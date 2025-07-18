package com.mpbhms.backend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.Instant;

@Entity
@Table(name = "scan_logs")
@Getter
@Setter
public class ScanLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String fileName;

    private Long roomId;

    @Column(columnDefinition = "TEXT")
    private String result;

    private Instant scanTime;

    @Column(columnDefinition = "TEXT")
    private String errorMessage;
} 