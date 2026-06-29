package com.business.busmanagement.config;

/* ============================================================
 * Filter chạy MỖI request:
 *   1. Lấy token từ Authorization header (hoặc query param cho SSE)
 *   2. Verify token → set Authentication vào SecurityContext
 *   3. Nếu không có token → để SecurityConfig quyết định cho qua hay 401
 * ============================================================ */

import com.business.busmanagement.model.User;
import com.business.busmanagement.service.JwtService;
import com.business.busmanagement.service.UserService;
import com.business.busmanagement.util.RoleNormalizer;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.Optional;

@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final UserService userService;

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain) throws ServletException, IOException {
        // Ưu tiên Authorization header; fallback về query param `access_token`
        // cho SSE (EventSource API của browser không gửi được custom header).
        String token = null;
        final String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            token = authHeader.substring(7);
        } else if (request.getRequestURI().endsWith("/notifications/stream")) {
            token = request.getParameter("access_token");
        }

        if (token == null) {
            filterChain.doFilter(request, response);
            return;
        }

        try {
            String username = jwtService.extractUsername(token);

            var currentAuth = SecurityContextHolder.getContext().getAuthentication();

            if (username != null &&
                    (currentAuth == null ||
                            currentAuth instanceof AnonymousAuthenticationToken ||
                            !currentAuth.isAuthenticated())) {
                Optional<User> userOptional = userService.findByUsernameWithRole(username);

                if (userOptional.isEmpty()) {
                    log.warn("JWT auth failed: user '{}' not found in database for token starting with {}",
                            username, token.length() > 10 ? token.substring(0, 10) + "..." : token);
                } else if (jwtService.isTokenValid(token, userOptional.get())) {
                    String roleName = RoleNormalizer.normalize(jwtService.extractRole(token));
                    String dbRoleName = RoleNormalizer.normalize(userOptional.get().getRole().getName());

                    if (!roleName.equals(dbRoleName)) {
                        log.warn("JWT auth failed: role mismatch — token role='{}', DB role='{}' for user '{}'. "
                                        + "Request will be treated as unauthenticated. "
                                        + "This usually means the token was issued before a role change. "
                                        + "User should re-login.",
                                roleName, dbRoleName, username);
                    } else {
                        UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                                username,
                                null,
                                List.of(new SimpleGrantedAuthority("ROLE_" + roleName)));

                        authentication.setDetails(
                                new WebAuthenticationDetailsSource().buildDetails(request));

                        SecurityContextHolder.getContext().setAuthentication(authentication);
                        log.debug("JWT auth success: user='{}', role='{}' for {}", username, roleName, request.getRequestURI());
                    }
                } else {
                    log.warn("JWT auth failed: token is invalid or expired for user '{}'. "
                                    + "Token was valid at issuance but may have been revoked or the secret key changed. "
                                    + "User should re-login.",
                            username);
                }
            }
        } catch (Exception ex) {
            log.error("JwtAuthenticationFilter: unexpected error during authentication for request {} — {}: {}",
                    request.getRequestURI(), ex.getClass().getSimpleName(), ex.getMessage(), ex);
        }

        filterChain.doFilter(request, response);
    }

    @Override
    protected boolean shouldNotFilter(@NonNull HttpServletRequest request) {
        String path = request.getRequestURI();
        return path.startsWith("/api/public/auth") || path.equals("/api/health");
    }
}