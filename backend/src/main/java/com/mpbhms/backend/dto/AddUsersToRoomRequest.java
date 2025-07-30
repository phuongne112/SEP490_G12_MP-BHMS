package com.mpbhms.backend.dto;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;
@Getter
@Setter
public class AddUsersToRoomRequest {
    private Long roomId;
    private List<Long> userIds;

    private Instant contractStartDate;
    private Instant contractEndDate;
    private Double depositAmount;
    private String paymentCycle; // Enum: MONTHLY, QUARTERLY, ...
}