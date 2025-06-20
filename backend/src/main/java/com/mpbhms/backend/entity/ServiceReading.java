package com.mpbhms.backend.entity;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Entity
@Table(name = "servicereadings")
@Getter
@Setter
public class ServiceReading extends BaseEntity {

    // Quan hệ với Room
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_id", nullable = false)
    @JsonBackReference  // ⬅️ THÊM DÒNG NÀY
    private Room room;

    // Quan hệ với Service (chỉ áp dụng với serviceType = ELECTRIC)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "service_id")
    @JsonBackReference  // nếu bên CustomService có @JsonManagedReference
    private CustomService service;


    @Column(name = "old_reading", precision = 15, scale = 3)
    private BigDecimal oldReading;

    @Column(name = "new_reading", precision = 15, scale = 3)
    private BigDecimal newReading;

}

