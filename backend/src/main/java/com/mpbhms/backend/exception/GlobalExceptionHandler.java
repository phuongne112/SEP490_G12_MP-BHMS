package com.mpbhms.backend.exception;

import com.mpbhms.backend.entity.ApiResponse;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.hibernate.exception.ConstraintViolationException;

import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private ResponseEntity<ApiResponse<?>> buildResponse(HttpStatus status, String errorCode, String message,
            Object data) {
        ApiResponse<?> response = new ApiResponse<>(
                status.value(),
                errorCode,
                message,
                data);
        return ResponseEntity.status(status).body(response);
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ApiResponse<?>> handleResourceNotFound(ResourceNotFoundException ex) {
        return buildResponse(HttpStatus.NOT_FOUND, "RESOURCE_NOT_FOUND", ex.getMessage() != null ? ex.getMessage() : "Không tìm thấy tài nguyên.", null);
    }

    @ExceptionHandler({
            UsernameNotFoundException.class,
            BadCredentialsException.class
    })
    public ResponseEntity<ApiResponse<?>> handleAuthenticationException(Exception ex) {
        return buildResponse(HttpStatus.UNAUTHORIZED, "AUTH_FAILED", "Tên đăng nhập hoặc mật khẩu không đúng.", null);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiResponse<?>> handleIllegalArgument(IllegalArgumentException ex) {
        return buildResponse(HttpStatus.BAD_REQUEST, "ILLEGAL_ARGUMENT", ex.getMessage() != null ? ex.getMessage() : "Tham số truyền vào không hợp lệ.", null);
    }

    @ExceptionHandler(NullPointerException.class)
    public ResponseEntity<ApiResponse<?>> handleNullPointer(NullPointerException ex) {
        return buildResponse(HttpStatus.INTERNAL_SERVER_ERROR, "NULL_POINTER", "Lỗi hệ thống: dữ liệu bị thiếu hoặc null.", null);
    }

    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ApiResponse<?>> handleBusinessException(BusinessException ex) {
        return buildResponse(ex.getStatus(), ex.getErrorCode(), ex.getMessage() != null ? ex.getMessage() : "Có lỗi nghiệp vụ xảy ra.", ex.getData());
    }

    @ExceptionHandler(ValidationException.class)
    public ResponseEntity<ApiResponse<?>> handleValidationException(ValidationException ex) {
        return buildResponse(ex.getStatus(), "VALIDATION_ERROR", ex.getMessage() != null ? ex.getMessage() : "Dữ liệu không hợp lệ. Vui lòng kiểm tra lại!", ex.getErrors());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<?>> handleValidationErrors(MethodArgumentNotValidException ex) {
        Map<String, String> errors = new HashMap<>();
        ex.getBindingResult().getAllErrors().forEach((error) -> {
            String fieldName = ((FieldError) error).getField();
            String errorMessage = error.getDefaultMessage();
            errors.put(fieldName, errorMessage);
        });
        return buildResponse(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Dữ liệu gửi lên không hợp lệ. Vui lòng kiểm tra lại các trường thông tin!", errors);
    }

    @ExceptionHandler({ DataIntegrityViolationException.class, ConstraintViolationException.class })
    public ResponseEntity<ApiResponse<?>> handleDataIntegrityViolation(Exception ex) {
        String message = "Dữ liệu bị trùng lặp hoặc vi phạm ràng buộc.";
        Throwable cause = ex.getCause();
        if (cause != null && cause.getMessage() != null) {
            String causeMsg = cause.getMessage();
            if (causeMsg.contains("Duplicate entry")) {
                if (causeMsg.contains("username")) {
                    message = "Tên đăng nhập đã tồn tại.";
                } else if (causeMsg.contains("email")) {
                    message = "Email đã tồn tại.";
                } else {
                    message = "Dữ liệu bị trùng lặp.";
                }
            }
        }
        return buildResponse(HttpStatus.BAD_REQUEST, "DATA_INTEGRITY_ERROR", message, null);
    }

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<ApiResponse<?>> handleRuntimeException(RuntimeException ex) {
        return buildResponse(HttpStatus.BAD_REQUEST, "RUNTIME_ERROR", ex.getMessage() != null ? ex.getMessage() : "Có lỗi xảy ra trong quá trình xử lý.", null);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<?>> handleGlobalException(Exception ex) {
        return buildResponse(HttpStatus.INTERNAL_SERVER_ERROR, ex.getClass().getSimpleName(), "Lỗi hệ thống. Vui lòng thử lại sau!", null);
    }

}
