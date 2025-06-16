package com.mpbhms.backend.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

public class GmailValidator implements ConstraintValidator<Gmail, String> {

    private static final String VIETNAM_EMAIL_REGEX =
            "^[A-Za-z0-9._%+-]+@(gmail\\.com(\\.vn)?"
                    + "|fpt\\.edu\\.vn"
                    + "|student\\.hust\\.edu\\.vn"
                    + "|hcmut\\.edu\\.vn"
                    + "|stu\\.edu\\.vn"
                    + "|vnuit\\.edu\\.vn"
                    + "|[A-Za-z0-9.-]+\\.edu\\.vn"
                    + ")$";

    @Override
    public boolean isValid(String email, ConstraintValidatorContext context) {
        if (email == null) return false;

        if (email.length() >= 50) {
            context.disableDefaultConstraintViolation();
            context.buildConstraintViolationWithTemplate("Email must not exceed 50 characters.")
                    .addConstraintViolation();
            return false;
        }

        if (!email.matches(VIETNAM_EMAIL_REGEX)) {
            context.disableDefaultConstraintViolation();
            context.buildConstraintViolationWithTemplate("Email must be a valid Gmail or accepted .edu.vn address.")
                    .addConstraintViolation();
            return false;
        }

        return true;
    }
}
