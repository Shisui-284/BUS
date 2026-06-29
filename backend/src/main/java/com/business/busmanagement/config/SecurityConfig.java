package com.business.busmanagement.config;

/* ============================================================
 * Cấu hình bảo mật Spring Security:
 *   - CSRF: TẮT (REST API dùng JWT)
 *   - Session: STATELESS (mỗi request tự có JWT)
 *   - CORS: load từ app.cors.allowed-origins
 *   - URL public: /api/public/**, /api/public/payment/vnpay/return, /api/public/payment/vnpay/ipn
 *   - URL private: cần JWT (role check tại controller)
 *   - URL admin: cần role ADMIN/DISPATCHER
 * ============================================================ */

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
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
@Slf4j
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final JwtAuthenticationEntryPoint jwtAuthenticationEntryPoint;

    @Value("${app.cors.allowed-origins}")
    private String allowedOrigins;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint(jwtAuthenticationEntryPoint)
                        .accessDeniedHandler((request, response, accessDeniedException) -> {
                            log.warn("AccessDenied for {} {}: user={}, roles={}, exception={}",
                                    request.getMethod(), request.getRequestURI(),
                                    request.getUserPrincipal() != null ? request.getUserPrincipal().getName() : "null",
                                    request.isUserInRole("CUSTOMER") ? "CUSTOMER" : (request.isUserInRole("ADMIN") ? "ADMIN" : "NONE"),
                                    accessDeniedException.getMessage());
                            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                            response.setCharacterEncoding("UTF-8");
                            response.getWriter().write("{\"status\":403,\"error\":\"Forbidden\",\"message\":\"Bạn không có quyền thực hiện thao tác này\"}");
                        }))
                .authorizeHttpRequests(authz -> authz
                        .requestMatchers("/api/public/auth/register", "/api/public/auth/login", "/api/public/auth/google", "/api/health",
                                "/api/debug/**")
                        .permitAll()
                        // VNPay IPN + Return URL — server-to-server / user redirect, không cần auth
                        .requestMatchers("/api/public/payment/vnpay/**").permitAll()
                        // SSE endpoint — cần auth admin; đã có rule "/api/admin/**" hasRole("ADMIN") bên dưới
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
                        // PRIVATE — VNPay tạo URL thanh toán (cần đăng nhập CUSTOMER)
                        .requestMatchers(HttpMethod.POST, "/api/private/payment/vnpay/create").hasRole("CUSTOMER")
                        // PRIVATE — Feedback (customer gửi / xem / reply / đóng)
                        .requestMatchers("/api/private/feedbacks/**").hasRole("CUSTOMER")
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