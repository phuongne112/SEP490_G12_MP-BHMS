package com.mpbhms.backend.dto;


import lombok.Data;

@Data
public class PermissionDTO {
    private Long id;
    private String name;
    private String apiPath;
    private String method;
    private String module;
}