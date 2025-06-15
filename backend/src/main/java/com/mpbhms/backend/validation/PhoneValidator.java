package com.mpbhms.backend.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

public class PhoneValidator implements ConstraintValidator<Phone, String> {

    // Regex kiểm tra số điện thoại di động Việt Nam hợp lệ
    private static final String VN_PHONE_REGEX = "^(03[2-9]|05[689]|07[06-9]|08[1-6|8|9]|09\\d)\\d{7}$";

    @Override
    public boolean isValid(String phone, ConstraintValidatorContext context) {
        if (phone == null) return false;
        return phone.matches(VN_PHONE_REGEX);
    }
}
