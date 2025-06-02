package com.mpbhms.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
public class LoginDTORes {
    private String accessToken;
    private UserLogin user;
    @Getter
    @Setter
    @AllArgsConstructor
    public static class UserLogin{
        private long id;
        private String email;
        private String name;
    }
}
