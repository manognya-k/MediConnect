package com.cts.mfrp.config;

import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
@ConditionalOnWebApplication
public class CorsConfig implements WebMvcConfigurer {

    @Override
    public void addCorsMappings(@org.springframework.lang.NonNull CorsRegistry registry) {
        registry.addMapping("/**")
                // allowedOriginPatterns (not allowedOrigins) is required when
                // allowCredentials=true and you want wildcard subdomain matching.
                .allowedOriginPatterns(
                        "http://localhost:*",
                        "https://*.netlify.app",
                        "https://*.up.railway.app"
                )
                .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .exposedHeaders("Authorization")
                .allowCredentials(true)
                .maxAge(3600);
    }
}
