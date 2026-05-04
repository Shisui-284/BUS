package com.business.busmanagement.service;

import com.business.busmanagement.dto.AuthResponse;
import com.business.busmanagement.dto.LoginRequest;
import com.business.busmanagement.dto.RegisterRequest;
import com.business.busmanagement.exception.BusinessConflictException;
import com.business.busmanagement.model.Passenger;
import com.business.busmanagement.model.Role;
import com.business.busmanagement.model.User;
import com.business.busmanagement.repository.PassengerRepository;
import com.business.busmanagement.repository.RoleRepository;
import com.business.busmanagement.repository.UserRepository;
import com.business.busmanagement.util.RoleNormalizer;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Objects;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PassengerRepository passengerRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    @Transactional
    public AuthResponse registerUser(RegisterRequest request) {
        // Check if username or email already exists
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new BusinessConflictException("Username already exists");
        }

        if (userRepository.existsByEmail(request.getEmail())) {
            throw new BusinessConflictException("Email already exists");
        }

        // Public registration must only create CUSTOMER accounts.
        Role customerRole = roleRepository.findByName("CUSTOMER")
                .orElseThrow(() -> new IllegalStateException(
                        "Required role CUSTOMER is not configured. Please initialize roles before registering users."));

        // Create user
        User user = new User();
        user.setUsername(request.getUsername());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setEmail(request.getEmail());
        user.setRole(customerRole);
        user.setStatus(User.UserStatus.ACTIVE);

        User savedUser = userRepository.save(user);

        Passenger passenger = new Passenger();
        passenger.setUser(savedUser);
        passenger.setFullName(request.getFullName());
        passenger.setEmail(request.getEmail());
        passenger.setPhone("");
        passengerRepository.save(passenger);

        // Generate token
        String token = jwtService.generateToken(savedUser);

        return createAuthResponse(token, savedUser);
    }

    public AuthResponse authenticateUser(LoginRequest request) {
        User user = userRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new SecurityException("Invalid credentials"));

        if (user.getStatus() != User.UserStatus.ACTIVE) {
            throw new SecurityException("Account is not active");
        }

        String selectedRole = request.getRole();
        if (selectedRole == null || selectedRole.isBlank()) {
            selectedRole = user.getRole() != null ? user.getRole().getName() : null;
        }
        selectedRole = RoleNormalizer.normalize(selectedRole);
        String actualRole = RoleNormalizer.normalize(user.getRole().getName());
        if (!selectedRole.equals(actualRole)) {
            throw new SecurityException("Account does not match selected role");
        }

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new SecurityException("Invalid credentials");
        }

        String token = jwtService.generateToken(user);
        return createAuthResponse(token, user);
    }

    public Optional<User> findByUsername(String username) {
        return userRepository.findByUsername(username);
    }

    public Optional<User> findById(Long id) {
        Long userId = Objects.requireNonNull(id, "id is required");
        return userRepository.findById(userId);
    }

    private AuthResponse createAuthResponse(String token, User user) {
        return new AuthResponse(token, createUserDto(user));
    }

    public AuthResponse.UserDto createUserDto(User user) {
        AuthResponse.UserDto userDto = new AuthResponse.UserDto();
        userDto.setId(user.getId());
        userDto.setUsername(user.getUsername());
        userDto.setEmail(user.getEmail());
        userDto.setRole(RoleNormalizer.normalize(user.getRole().getName()));

        Optional<Passenger> passenger = passengerRepository.findByUserId(user.getId());
        passenger.ifPresent(pass -> {
            userDto.setFullName(pass.getFullName());
            userDto.setPhone(pass.getPhone());
        });
        return userDto;
    }

}