package com.business.busmanagement.controller;

/* ============================================================
 * PROFILE CONTROLLER — Module: Hồ sơ cá nhân (Customer)
 * Endpoint:
 *   GET  /api/auth/profile  → lấy thông tin user đang đăng nhập (từ JWT token)
 *   PUT  /api/auth/profile  → cập nhật họ tên + SĐT passenger
 * ============================================================ */

import com.business.busmanagement.dto.AuthResponse;
import com.business.busmanagement.dto.UpdateProfileRequest;
import com.business.busmanagement.model.Passenger;
import com.business.busmanagement.model.User;
import com.business.busmanagement.repository.PassengerRepository;
import com.business.busmanagement.service.JwtService;
import com.business.busmanagement.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@CrossOrigin(origins = "${app.cors.allowed-origins}")
public class ProfileController {

    private final JwtService jwtService;
    private final UserService userService;
    private final PassengerRepository passengerRepository;

    // GET /api/auth/profile — Lấy thông tin user từ JWT trong header Authorization
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

    // PUT /api/auth/profile — Cập nhật fullName + phone cho Passenger (chỉ CUSTOMER)
    @PutMapping("/profile")
    public ResponseEntity<AuthResponse.UserDto> updateProfile(
            @Valid @RequestBody UpdateProfileRequest request) {

        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userService.findByUsername(username)
                .orElseThrow(() -> new SecurityException("User not found"));

        // Cập nhật Passenger nếu là CUSTOMER
        Optional<Passenger> passengerOpt = passengerRepository.findByUserId(user.getId());
        if (passengerOpt.isPresent()) {
            Passenger passenger = passengerOpt.get();
            passenger.setFullName(request.getFullName());
            passenger.setPhone(request.getPhone());
            passengerRepository.save(passenger);
        }

        return ResponseEntity.ok(userService.createUserDto(user));
    }
}
