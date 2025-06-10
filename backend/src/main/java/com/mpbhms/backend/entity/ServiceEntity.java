package com.mpbhms.backend.entity;

import jakarta.persistence.*;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "services")
@Data
public class ServiceEntity extends BaseEntity {
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ServiceType serviceType;

    @Column( nullable = false)
    private String serviceName;

    private String unit;

    @Column(precision = 10, scale = 2)
    private BigDecimal unitPrice;

    @ManyToMany(mappedBy = "services")
    private List<RoomEntity> rooms;


    // Enum nội bộ
    public enum ServiceType {
        ELECTRICITY,
        WATER,
        OTHER
    }
}
