package com.mpbhms.backend.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.*;

@Documented
@Constraint(validatedBy = GmailValidator.class)
@Target({ ElementType.FIELD, ElementType.PARAMETER })
@Retention(RetentionPolicy.RUNTIME)
public @interface Gmail {
    String message() default "Email must be a valid Gmail address (e.g. example@gmail.com)";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}
