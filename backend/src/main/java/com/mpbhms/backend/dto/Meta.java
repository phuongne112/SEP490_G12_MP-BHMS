package com.mpbhms.backend.dto;


import lombok.Data;
import lombok.Getter;
import lombok.Setter;

@Data
public class Meta {
    private int page;
    private int pageSize;
    private int pages;
    private long total;
}
