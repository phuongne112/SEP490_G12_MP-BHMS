package com.mpbhms.backend.dto;

import lombok.Data;
import lombok.Getter;
import lombok.Setter;

@Data
public class ResultPaginationDTO {
    private Meta meta;
    private Object result;
}
