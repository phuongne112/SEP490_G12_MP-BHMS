package com.mpbhms.backend.dto;


import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Meta {
    private int page;
    private int pageSize;
    private int pages;
    private long total;
}
