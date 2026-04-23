package com.business.busmanagement.controller;

import com.business.busmanagement.dto.AuthResponse;
import com.business.busmanagement.model.User;
import com.business.busmanagement.service.JwtService;
import com.business.busmanagement.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@CrossOrigin(origins = "${app.cors.allowed-origins}")
public class ProfileController {

    private final JwtService jwtService;
    private final UserService userService;

    @GetMapping("/profile")
    public ResponseEntity<AuthResponse.UserDto> getProfile(@RequestHeader("Authorization") String authorizationHeader) {
        if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        String token = authorizationHeader.substring(7);
        String username;
        try {
            username = jwtService.extractUsername(token);
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        Optional<User> userOptional = userService.findByUsername(username);
        if (userOptional.isEmpty() || !jwtService.isTokenValid(token, userOptional.get())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        return ResponseEntity.ok(userService.createUserDto(userOptional.get()));
    }
}
