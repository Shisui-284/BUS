package com.business.busmanagement.config;

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
        final String authHeader = request.getHeader("Authorization");

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        final String token = authHeader.substring(7);

        try {
            String username = jwtService.extractUsername(token);

            var currentAuth = SecurityContextHolder.getContext().getAuthentication();

            if (username != null &&
                    (currentAuth == null ||
                            currentAuth instanceof AnonymousAuthenticationToken ||
                            !currentAuth.isAuthenticated())) {
                Optional<User> userOptional = userService.findByUsername(username);

                if (userOptional.isPresent() && jwtService.isTokenValid(token, userOptional.get())) {
                    String roleName = RoleNormalizer.normalize(jwtService.extractRole(token));

                    UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                            username,
                            null,
                            List.of(new SimpleGrantedAuthority("ROLE_" + roleName)));

                    authentication.setDetails(
                            new WebAuthenticationDetailsSource().buildDetails(request));

                    SecurityContextHolder.getContext().setAuthentication(authentication);
                }
            }
        } catch (Exception ex) {
            log.debug("JwtAuthenticationFilter: invalid token or authentication failed", ex);
        }

        filterChain.doFilter(request, response);
    }

    @Override
    protected boolean shouldNotFilter(@NonNull HttpServletRequest request) {
        String path = request.getRequestURI();
        return path.startsWith("/api/public/auth") || path.equals("/api/health");
    }
}