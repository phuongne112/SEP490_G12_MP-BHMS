package com.mpbhms.backend.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

public class PasswordValidator implements ConstraintValidator<Password, String> {

    @Override
    public boolean isValid(String password, ConstraintValidatorContext context) {
        if (password == null) {
            return false;
        }

        // 👉 Kiểm tra riêng độ dài tối đa
        if (password.length() >= 20) {
            context.disableDefaultConstraintViolation();
            context.buildConstraintViolationWithTemplate("Password must not exceed 20 characters.")
                    .addConstraintViolation();
            return false;
        }

        // 👉 Regex chung cho các điều kiện còn lại
        String pattern = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@#$%^&+=!]).{8,}$";
        if (!password.matches(pattern)) {
            context.disableDefaultConstraintViolation();
            context.buildConstraintViolationWithTemplate("Password must be at least 8 characters and include uppercase, lowercase, number and special character.")
                    .addConstraintViolation();
            return false;
        }

        return true;
    }
}
