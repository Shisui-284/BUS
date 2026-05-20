package com.business.busmanagement.config;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.AnonymousAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    @Value("${app.cors.allowed-origins}")
    private String allowedOrigins;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(authz -> authz
                        .requestMatchers("/api/public/auth/register", "/api/public/auth/login", "/api/health",
                                "/api/debug/**")
                        .permitAll()
                        .requestMatchers("/api/auth/profile").authenticated()
                        // PUBLIC — tìm chuyến không cần đăng nhập
                        .requestMatchers(HttpMethod.GET, "/api/public/trips/search").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/public/trips").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/public/trips/*/seats").permitAll()
                        // PRIVATE — chỉ CUSTOMER
                        .requestMatchers(HttpMethod.POST, "/api/private/tickets").hasRole("CUSTOMER")
                        .requestMatchers(HttpMethod.GET, "/api/private/tickets/my").hasRole("CUSTOMER")
                        .requestMatchers(HttpMethod.PUT, "/api/private/tickets/*/cancel").hasRole("CUSTOMER")
                        .requestMatchers(HttpMethod.PUT, "/api/private/tickets/*/pay").hasRole("CUSTOMER")
                        // PRIVATE — profile (mọi role đã đăng nhập)
                        .requestMatchers(HttpMethod.PUT, "/api/auth/profile").authenticated()
                        // ADMIN — quản lý hệ thống
                        .requestMatchers("/api/admin/**").hasRole("ADMIN")
                        .anyRequest().authenticated())
                .addFilterBefore(jwtAuthenticationFilter, AnonymousAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOriginPatterns(Arrays.asList(allowedOrigins.split(",")));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

}