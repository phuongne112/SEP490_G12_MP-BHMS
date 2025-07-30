    package com.mpbhms.backend.config;

    import org.springframework.context.annotation.Bean;
    import org.springframework.context.annotation.Configuration;
    import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
    import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

    @Configuration
    public class PermissionInterceptorConfiguration implements WebMvcConfigurer {

        @Bean
        public PermissionInterceptor getPermissionInterceptor() {
            return new PermissionInterceptor();
        }

        @Override
        public void addInterceptors(InterceptorRegistry registry) {
            String[] whiteList = {
                    "/",
                    "/mpbhms/auth/login",
                    "/mpbhms/auth/logout",
                    "/mpbhms/auth/refresh",
                    "/mpbhms/auth/account",
                    "/mpbhms/auth/change-password",
                    "/mpbhms/auth/request-reset",
                    "/mpbhms/auth/reset-password",
                    "/mpbhms/auth/signup",
                    "/mpbhms/users/me/account",
                    "/mpbhms/users/me/info"

            };

            registry.addInterceptor(getPermissionInterceptor())
                    .excludePathPatterns(whiteList);
        }
    }