package com.mpbhms.backend.entity;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.mpbhms.backend.enums.BillItemType;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "billdetails")
@Getter
@Setter
public class BillDetail extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "bill_id")
    @JsonBackReference
    private Bill bill;


    @Enumerated(EnumType.STRING)
    @Column(name = "item_type", nullable = false, length = 20)
    private BillItemType itemType;

    @Column(columnDefinition = "TEXT")
    private String description;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "service_id")
    private CustomService service;

    @Column(name = "unit_price_at_bill", precision = 10, scale = 2)
    private BigDecimal unitPriceAtBill;

    @Column(name = "consumed_units", precision = 15, scale = 3)
    private BigDecimal consumedUnits;

    @Column(name = "item_amount", precision = 15, scale = 2, nullable = false)
    private BigDecimal itemAmount;
}

