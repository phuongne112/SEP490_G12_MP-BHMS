package com.mpbhms.backend.entity;

import jakarta.persistence.*;
import lombok.Data;

import java.time.Instant;
import java.time.LocalDateTime;
@Data
@Entity
@Table(name = "RoomUsers", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"room_id", "user_id"})
})
public class RoomUserEntity extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_id", nullable = false)
    private RoomEntity room;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private UserEntity user;

    @Enumerated(EnumType.STRING)
    @Column(name = "role_in_room", nullable = false)
    private RoleInRoom roleInRoom = RoleInRoom.Tenant;

    @Column(name = "joined_at", nullable = false)
    private Instant joinedAt = Instant.now();

    @Column(name = "leave_date")
    private Instant leaveDate;

    @Column(name = "is_active")
    private Boolean isActive = true;

    public enum RoleInRoom {
        Tenant,
        Co_Tenant
    }
}