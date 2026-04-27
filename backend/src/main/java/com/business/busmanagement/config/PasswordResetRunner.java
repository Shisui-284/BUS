package com.business.busmanagement.config;

import com.business.busmanagement.model.Role;
import com.business.busmanagement.model.User;
import com.business.busmanagement.repository.RoleRepository;
import com.business.busmanagement.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@Order(2)
@RequiredArgsConstructor
@Slf4j
public class PasswordResetRunner implements CommandLineRunner {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

    private static final String DEFAULT_PASSWORD = "ChangeMe@123";

    @Override
    @Transactional
    public void run(String... args) {
        Role staffRole = roleRepository.findByName("STAFF").orElse(null);
        if (staffRole == null) {
            log.warn("[PasswordReset] STAFF role not found, skipping");
            return;
        }

        userRepository.findByUsername("dispatcher").ifPresentOrElse(
            user -> {
                user.setPasswordHash(passwordEncoder.encode(DEFAULT_PASSWORD));
                user.setRole(staffRole);
                user.setStatus(User.UserStatus.ACTIVE);
                User saved = userRepository.save(user);
                log.info("[PasswordReset] Dispatcher updated: id={}, role={}, passwordHash={}... (first 10 chars)",
                    saved.getId(), staffRole.getName(), saved.getPasswordHash().substring(0, 10));
            },
            () -> log.warn("[PasswordReset] Dispatcher user not found in database")
        );
    }
}
