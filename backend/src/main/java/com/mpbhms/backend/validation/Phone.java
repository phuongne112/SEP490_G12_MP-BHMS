package com.mpbhms.backend.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.*;

@Documented
@Constraint(validatedBy = PhoneValidator.class)
@Target({ ElementType.FIELD, ElementType.PARAMETER })
@Retention(RetentionPolicy.RUNTIME)
public @interface Phone {
    String message() default "Số điện thoại không hợp lệ. Số điện thoại phải bắt đầu bằng 0, có đúng 10 chữ số và đầu số hợp lệ của Việt Nam.";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}
