package com.business.busmanagement.service;

/* ============================================================
 * USER SERVICE — Module: Đăng ký / Đăng nhập / Quản lý User
 * Chức năng:
 *   - registerUser: tạo CUSTOMER + auto-tạo Passenger
 *   - authenticateUser: login username/password → trả JWT
 *   - authenticateGoogle: login bằng Google ID token
 *   - findByUsername / createUserDto / resetPassword...
 * ============================================================ */

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
        // B1: Check username/email đã tồn tại chưa
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new BusinessConflictException("Username already exists");
        }

        if (userRepository.existsByEmail(request.getEmail())) {
            throw new BusinessConflictException("Email already exists");
        }

        // B2: Public register chỉ tạo CUSTOMER (không cho tạo ADMIN từ API public)
        Role customerRole = roleRepository.findByName("CUSTOMER")
                .orElseThrow(() -> new IllegalStateException(
                        "Required role CUSTOMER is not configured. Please initialize roles before registering users."));

        // B3: Tạo User với password đã mã hóa BCrypt
        User user = new User();
        user.setUsername(request.getUsername());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setEmail(request.getEmail());
        user.setRole(customerRole);
        user.setStatus(User.UserStatus.ACTIVE);

        User savedUser = userRepository.save(user);

        // B4: Auto-tạo Passenger rỗng (sẽ được cập nhật khi đặt vé)
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
        // B1: Tìm user theo username
        User user = userRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new SecurityException("Invalid credentials"));

        // B2: Check tài khoản còn active không
        if (user.getStatus() != User.UserStatus.ACTIVE) {
            throw new SecurityException("Account is not active");
        }

        // B3: Check role client gửi lên có khớp role thực tế không (chống đăng nhập nhầm)
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

    @Transactional
    public AuthResponse authenticateGoogle(com.business.busmanagement.dto.GoogleAuthRequest request) {
        // B1: Verify ID token với Google endpoint
        String url = "https://oauth2.googleapis.com/tokeninfo?id_token=" + request.getIdToken();
        org.springframework.web.client.RestTemplate restTemplate = new org.springframework.web.client.RestTemplate();
        java.util.Map<String, Object> response;
        try {
            response = restTemplate.getForObject(url, java.util.Map.class);
        } catch (Exception e) {
            throw new SecurityException("Invalid Google ID Token");
        }

        if (response == null || response.get("email") == null) {
            throw new SecurityException("Invalid Google ID Token (no email)");
        }

        String email = (String) response.get("email");
        String name = (String) response.get("name");
        String sub = (String) response.get("sub");

        // B2: User đã tồn tại → check active; chưa có → tạo mới CUSTOMER + Passenger
        Optional<User> optionalUser = userRepository.findByEmail(email);
        User user;
        if (optionalUser.isPresent()) {
            user = optionalUser.get();
            if (user.getStatus() != User.UserStatus.ACTIVE) {
                throw new SecurityException("Account is not active");
            }
        } else {
            // Auto-register: username = google_<sub>, password ngẫu nhiên
            Role customerRole = roleRepository.findByName("CUSTOMER")
                    .orElseThrow(() -> new IllegalStateException("Required role CUSTOMER is not configured."));
            
            user = new User();
            user.setUsername("google_" + sub);
            user.setPasswordHash(passwordEncoder.encode(java.util.UUID.randomUUID().toString()));
            user.setEmail(email);
            user.setRole(customerRole);
            user.setStatus(User.UserStatus.ACTIVE);
            user = userRepository.save(user);

            Passenger passenger = new Passenger();
            passenger.setUser(user);
            passenger.setFullName(name != null ? name : email);
            passenger.setEmail(email);
            passenger.setPhone("");
            passengerRepository.save(passenger);
        }

        String token = jwtService.generateToken(user);
        return createAuthResponse(token, user);
    }

    /**
     * Tìm user kèm role đã fetch EAGER.
     * Dùng TRONG JwtAuthenticationFilter để tránh LazyInitializationException
     * khi truy cập user.getRole().getName() ngoài Hibernate session.
     */
    public Optional<User> findByUsernameWithRole(String username) {
        return userRepository.findByUsernameWithRole(username);
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