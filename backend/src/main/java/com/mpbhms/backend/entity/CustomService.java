package com.mpbhms.backend.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import com.mpbhms.backend.enums.ServiceType;
import jakarta.persistence.*;
import lombok.Data;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "services")
@Data
public class CustomService extends BaseEntity {

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ServiceType serviceType;

    @Column(nullable = false)
    private String serviceName;

    private String unit;

    @Column(precision = 10, scale = 2)
    private BigDecimal unitPrice;

    @ManyToMany(mappedBy = "services")
    @JsonIgnore // ✅ Ngăn vòng lặp Room -> Service -> Room -> ...
    private List<Room> rooms;

    @OneToMany(mappedBy = "service", cascade = CascadeType.ALL)
    @JsonManagedReference  // ⬅️ THÊM DÒNG NÀY
    private List<ServiceReading> serviceReadings = new ArrayList<>();
}