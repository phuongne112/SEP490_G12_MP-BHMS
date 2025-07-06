package com.mpbhms.backend.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.*;

@Documented
@Constraint(validatedBy = GmailValidator.class)
@Target({ ElementType.FIELD, ElementType.PARAMETER })
@Retention(RetentionPolicy.RUNTIME)
public @interface Gmail {
    String message() default "Email phải là địa chỉ Gmail hợp lệ (ví dụ: example@gmail.com) hoặc email .edu.vn được chấp nhận";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}
