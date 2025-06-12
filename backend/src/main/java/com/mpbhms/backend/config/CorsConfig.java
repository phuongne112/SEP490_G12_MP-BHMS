package com.mpbhms.backend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
public class CorsConfig {
    //CORS cho phép React FE gọi API
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
      config.setAllowedOrigins(Arrays.asList(
                "http://localhost:3000", "http://localhost:4173", "http://localhost:5173"));
        config.setAllowedMethods(Arrays.asList(
                "GET", "POST", "PUT", "DELETE", "OPTIONS")); // Allowed methods
        config.setAllowedHeaders(Arrays.asList(
                "Authorization", "Content-Type", "Accept", "x-no-retry"));
        config.setAllowCredentials(true); // dùng nếu truyền token

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
