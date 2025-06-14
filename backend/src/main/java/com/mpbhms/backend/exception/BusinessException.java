package com.mpbhms.backend.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

import java.util.Map;

@Getter
public class BusinessException extends RuntimeException {
    private final HttpStatus status;
    private final String errorCode;
    private final Map<String, String> data; // ✅ thêm data

    public BusinessException(String message) {
        super(message);
        this.status = HttpStatus.BAD_REQUEST;
        this.errorCode = "BUSINESS_ERROR";
        this.data = null;
    }

    public BusinessException(String message, HttpStatus status) {
        super(message);
        this.status = status;
        this.errorCode = "BUSINESS_ERROR";
        this.data = null;
    }

    public BusinessException(String message, HttpStatus status, String errorCode) {
        super(message);
        this.status = status;
        this.errorCode = errorCode;
        this.data = null;
    }

    // ✅ Constructor cho lỗi có `data`
    public BusinessException(String message, Map<String, String> data) {
        super(message);
        this.status = HttpStatus.BAD_REQUEST;
        this.errorCode = "BUSINESS_ERROR";
        this.data = data;
    }

    public BusinessException(String message, HttpStatus status, String errorCode, Map<String, String> data) {
        super(message);
        this.status = status;
        this.errorCode = errorCode;
        this.data = data;
    }

}
