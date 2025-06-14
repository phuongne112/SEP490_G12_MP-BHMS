package com.mpbhms.backend.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

import java.util.Map;

@Getter
public class ValidationException extends RuntimeException {
    private final Map<String, String> errors;
    private final HttpStatus status;

    public ValidationException(String message, Map<String, String> errors) {
        super(message);
        this.errors = errors;
        this.status = HttpStatus.BAD_REQUEST;
    }

    public ValidationException(String message, Map<String, String> errors, HttpStatus status) {
        super(message);
        this.errors = errors;
        this.status = status;
    }
} 