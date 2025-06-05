package com.mpbhms.backend.exception;

public class IdInvalidException extends RuntimeException {
    public IdInvalidException() {
        super("ID không hợp lệ.");
    }

    public IdInvalidException(String message) {
        super(message);
    }
}
