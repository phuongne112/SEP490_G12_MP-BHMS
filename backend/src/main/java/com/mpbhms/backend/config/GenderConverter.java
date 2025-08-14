package com.mpbhms.backend.config;

import com.mpbhms.backend.enums.Gender;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter
public class GenderConverter implements AttributeConverter<Gender, String> {

    @Override
    public String convertToDatabaseColumn(Gender gender) {
        if (gender == null) {
            return null;
        }
        return gender.name();
    }

    @Override
    public Gender convertToEntityAttribute(String dbData) {
        if (dbData == null) {
            return null;
        }
        
        // Xử lý các giá trị cũ từ database
        switch (dbData) {
            case "Male":
                return Gender.Nam;
            case "Female":
                return Gender.Nữ;
            case "Other":
                return Gender.Khác;
            case "Nam":
            case "Nữ":
            case "Khác":
                return Gender.valueOf(dbData);
            default:
                // Nếu không nhận diện được, trả về Khác
                return Gender.Khác;
        }
    }
}

