package com.mpbhms.backend.response;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class MessageDTOResponse {
    private String message;

    public MessageDTOResponse(String message) {
        this.message = message;
    }
}
