package com.mpbhms.backend.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.*;

@Documented
@Constraint(validatedBy = PhoneValidator.class)
@Target({ ElementType.FIELD, ElementType.PARAMETER })
@Retention(RetentionPolicy.RUNTIME)
public @interface Phone {
    String message() default "Số điện thoại không hợp lệ. Phải bắt đầu bằng 0 và có 10 chữ số.";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}
