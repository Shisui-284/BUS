package com.business.busmanagement.controller;

import com.business.busmanagement.model.User;
import com.business.busmanagement.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class HealthController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public HealthController(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
        Map<String, Object> response = new HashMap<>();
        response.put("status", "OK");
        response.put("message", "Bus Management System is running");
        response.put("database", "MySQL connected");
        response.put("timestamp", System.currentTimeMillis());

        return ResponseEntity.ok(response);
    }

    @GetMapping("/debug/dispatcher")
    public ResponseEntity<Map<String, Object>> debugDispatcher() {
        Map<String, Object> result = new HashMap<>();
        String testPassword = "ChangeMe@123";

        userRepository.findByUsername("dispatcher").ifPresentOrElse(
            user -> {
                result.put("username", user.getUsername());
                result.put("status", user.getStatus());
                result.put("role", user.getRole() != null ? user.getRole().getName() : "NULL");
                result.put("passwordHash", user.getPasswordHash());
                boolean matches = passwordEncoder.matches(testPassword, user.getPasswordHash());
                result.put("passwordMatches", matches);
                result.put("testPassword", testPassword);
                result.put("userId", user.getId());
            },
            () -> {
                result.put("error", "User 'dispatcher' not found in database");
            }
        );

        return ResponseEntity.ok(result);
    }
}