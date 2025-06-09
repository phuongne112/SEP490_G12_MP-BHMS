package com.mpbhms.backend.response;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class SignUpDTOResponse {
    private String message;

    public SignUpDTOResponse(String message) {
        this.message = message;
    }
}
