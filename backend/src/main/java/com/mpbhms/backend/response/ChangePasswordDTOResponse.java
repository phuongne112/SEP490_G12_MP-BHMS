package com.mpbhms.backend.response;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ChangePasswordDTOResponse {
    private String message;

    public ChangePasswordDTOResponse(String message) {
        this.message = message;
    }
}
