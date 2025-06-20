package com.mpbhms.backend.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.mpbhms.backend.enums.BillType;
import lombok.Data;

import java.time.Instant;
import java.time.LocalDate;

@Data
public class BillGenerateRequest {
    private Long contractId;
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss a",timezone = "GMT+7")
    private Instant fromDate;
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss a",timezone = "GMT+7")
    private Instant toDate;
    private BillType billType;
}
