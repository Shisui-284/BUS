package com.business.busmanagement.config;

/* ============================================================
 * Trả JSON 401 khi request không có authentication hợp lệ.
 * Đảm bảo FE nhận 401 (không phải 403/redirect) để xử lý logout.
 * ============================================================ */

import com.business.busmanagement.exception.ApiErrorResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.time.LocalDateTime;

/**
 * Trả về JSON 401 khi request không có authentication hợp lệ.
 * Nếu không có entry point này, Spring Security mặc định trả về 403 hoặc redirect.
 * Entry point này đảm bảo browser/frontend nhận được 401 thay vì 403.
 */
@Component
@Slf4j
public class JwtAuthenticationEntryPoint implements AuthenticationEntryPoint {

    private final ObjectMapper objectMapper;

    public JwtAuthenticationEntryPoint() {
        this.objectMapper = new ObjectMapper();
        this.objectMapper.registerModule(new JavaTimeModule());
    }

    @Override
    public void commence(HttpServletRequest request,
                         HttpServletResponse response,
                         AuthenticationException authException) throws IOException {
        String path = request.getRequestURI();

        log.debug("JwtAuthenticationEntryPoint triggered for {}: {}",
                path, authException.getMessage());

        response.setStatus(HttpStatus.UNAUTHORIZED.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");

        ApiErrorResponse error = new ApiErrorResponse(
                HttpStatus.UNAUTHORIZED.value(),
                HttpStatus.UNAUTHORIZED.getReasonPhrase(),
                "Chưa đăng nhập hoặc phiên đã hết hạn. Vui lòng đăng nhập lại.",
                LocalDateTime.now()
        );

        objectMapper.writeValue(response.getOutputStream(), error);
    }
}
