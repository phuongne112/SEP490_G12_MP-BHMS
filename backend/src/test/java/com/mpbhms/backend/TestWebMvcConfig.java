package com.mpbhms.backend;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.List;

@Configuration
public class TestWebMvcConfig implements WebMvcConfigurer {

    @Override
    public void addArgumentResolvers(List<HandlerMethodArgumentResolver> resolvers) {
        resolvers.add(new FilterSpecificationArgumentResolver());
    }

    private static class FilterSpecificationArgumentResolver implements HandlerMethodArgumentResolver {

        @Override
        public boolean supportsParameter(org.springframework.core.MethodParameter parameter) {
            return parameter.getParameterType().equals(Specification.class) &&
                    parameter.hasParameterAnnotation(com.turkraft.springfilter.boot.Filter.class);
        }

        @Override
        public Object resolveArgument(org.springframework.core.MethodParameter parameter,
                org.springframework.web.method.support.ModelAndViewContainer mavContainer,
                org.springframework.web.context.request.NativeWebRequest webRequest,
                org.springframework.web.bind.support.WebDataBinderFactory binderFactory) {
            // Return a simple specification that always returns true (no filtering)
            return (Specification<Object>) (root, query, criteriaBuilder) -> criteriaBuilder.conjunction();
        }
    }
}