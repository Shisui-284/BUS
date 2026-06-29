package com.business.busmanagement.repository;

/* ============================================================
 * findByUsernameWithRole: EAGER LOAD role (tránh LazyInitException)
 * ============================================================ */

import com.business.busmanagement.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByUsername(String username);

    /**
     * Tìm user kèm role đã fetch EAGER.
     * Dùng TRONG JwtAuthenticationFilter vì filter chạy NGOÀI transaction context,
     * nên User.role (lazy-loaded) sẽ gây LazyInitializationException nếu không join fetch.
     */
    @Query("SELECT u FROM User u LEFT JOIN FETCH u.role WHERE u.username = :username")
    Optional<User> findByUsernameWithRole(@Param("username") String username);

    Optional<User> findByEmail(String email);

    boolean existsByUsername(String username);

    boolean existsByEmail(String email);

    long countByRoleId(Long roleId);
}