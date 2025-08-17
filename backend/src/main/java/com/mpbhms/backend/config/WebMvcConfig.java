package com.mpbhms.backend.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // Resolve uploads directory with priority: ENV UPLOADS_DIR -> ENV MPBHMS_UPLOAD_FILE_BASE_URI -> user.dir/uploads
        String uploadsDir = System.getenv("UPLOADS_DIR");
        if (uploadsDir == null || uploadsDir.isBlank()) {
            String baseUri = System.getenv("MPBHMS_UPLOAD_FILE_BASE_URI");
            if (baseUri != null && baseUri.startsWith("file:")) {
                try {
                    java.net.URI uri = java.net.URI.create(baseUri);
                    uploadsDir = uri.getPath();
                } catch (Exception ignored) {
                    uploadsDir = null;
                }
            }
        }
        if (uploadsDir == null || uploadsDir.isBlank()) {
            uploadsDir = System.getProperty("user.dir") + "/uploads/";
        }
        if (!uploadsDir.endsWith("/")) {
            uploadsDir = uploadsDir + "/";
        }

        registry.addResourceHandler("/uploads/**")
                .addResourceLocations("file:" + uploadsDir);
        
        registry.addResourceHandler("/src/assets/**")
                .addResourceLocations("file:" + System.getProperty("user.dir") + "/frontend/src/assets/");
        
        registry.addResourceHandler("/img/**")
                .addResourceLocations("file:" + System.getProperty("user.dir") + "/frontend/public/img/");
    }

}
