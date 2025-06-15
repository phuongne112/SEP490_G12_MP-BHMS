package com.mpbhms.backend.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.*;

@Documented
@Constraint(validatedBy = PhoneValidator.class)
@Target({ ElementType.FIELD, ElementType.PARAMETER })
@Retention(RetentionPolicy.RUNTIME)
public @interface Phone {
    String message() default "Invalid phone number. It must start with 0 and contain exactly 10 digits with a valid Vietnamese prefix.";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}
