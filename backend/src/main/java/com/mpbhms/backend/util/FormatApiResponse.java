package com.mpbhms.backend.util;

import com.mpbhms.backend.entity.ApiResponse;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.MethodParameter;
import org.springframework.http.MediaType;
import org.springframework.http.converter.HttpMessageConverter;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.http.server.ServletServerHttpResponse;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.mvc.method.annotation.ResponseBodyAdvice;

@RestControllerAdvice
public class FormatApiResponse implements ResponseBodyAdvice{

    @Override
    public boolean supports(MethodParameter returnType, Class converterType) {
        return !byte[].class.equals(returnType.getParameterType());
    }

    @Override
    public Object beforeBodyWrite(Object body,
                                  MethodParameter returnType,
                                  MediaType selectedContentType,
                                  Class selectedConverterType,
                                  ServerHttpRequest request,
                                  ServerHttpResponse response) {

        HttpServletResponse servletResponse = ((ServletServerHttpResponse) response).getServletResponse();
        int statusCode = servletResponse.getStatus();

        // ✅ Bỏ qua nếu là file trả về (PDF, ảnh, Excel, ...)
        if (body instanceof byte[]) {
            return body;
        }

        // ✅ Bỏ qua nếu lỗi (đã được handle ở @ExceptionHandler)
        if (statusCode >= 400) {
            return body;
        }

        // ✅ Nếu trả về là String, vẫn cần trả về nguyên vẹn (nếu không sẽ lỗi MediaType)
        if (body instanceof String) {
            return body;
        }

        // ✅ Trả về ApiResponse bọc data
        ApiResponse<Object> apiResponse = new ApiResponse<>();
        apiResponse.setStatus(statusCode);
        apiResponse.setData(body);

        ApiMessage message = returnType.getMethodAnnotation(ApiMessage.class);
        apiResponse.setMessage(message != null ? message.value() : "Call api success");

        return apiResponse;
    }

}
