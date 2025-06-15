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
        return email.matches(VIETNAM_EMAIL_REGEX);
    }
}
