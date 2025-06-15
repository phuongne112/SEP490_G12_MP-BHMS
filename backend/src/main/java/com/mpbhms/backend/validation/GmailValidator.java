package com.mpbhms.backend.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

public class GmailValidator implements ConstraintValidator<Gmail, String> {

    private static final String GMAIL_REGEX = "^[A-Za-z0-9._%+-]+@gmail\\.com$";

    @Override
    public boolean isValid(String email, ConstraintValidatorContext context) {
        if (email == null) {
            return false;
        }
        return email.matches(GMAIL_REGEX);
    }
}
