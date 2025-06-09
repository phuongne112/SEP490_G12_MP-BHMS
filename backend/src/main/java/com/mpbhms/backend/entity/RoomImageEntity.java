package com.mpbhms.backend.entity;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

@Entity
@Table(name = "room_images")
@Data
public class RoomImageEntity extends BaseEntity {


    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_id")
    @JsonBackReference
    private RoomEntity room;


    @Column(name = "image_url", columnDefinition = "TEXT")
    private String imageURL;

}
