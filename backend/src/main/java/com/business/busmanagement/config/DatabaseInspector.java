package com.business.busmanagement.config;

/* ============================================================
 * Chạy sau khi app start (Order=100) → in ra log state DB.
 * Hỗ trợ debug xem roles + users đã seed chưa.
 * ============================================================ */

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;

@Component
@Order(100)
@Slf4j
public class DatabaseInspector implements CommandLineRunner {

    private final DataSource dataSource;

    public DatabaseInspector(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public void run(String... args) throws Exception {
        log.info("========== DATABASE INSPECTOR (Final State) ==========");
        inspectRoles();
        inspectUsers();
        log.info("======================================================");
    }

    private void inspectRoles() throws Exception {
        log.info("--- ROLES ---");
        try (Connection conn = dataSource.getConnection();
             PreparedStatement stmt = conn.prepareStatement("SELECT id, name, description FROM roles");
             ResultSet rs = stmt.executeQuery()) {
            while (rs.next()) {
                log.info("  Role[id={}, name='{}']", rs.getInt("id"), rs.getString("name"));
            }
        }
    }

    private void inspectUsers() throws Exception {
        log.info("--- USERS ---");
        try (Connection conn = dataSource.getConnection();
             PreparedStatement stmt = conn.prepareStatement(
                 "SELECT u.id, u.username, u.email, u.status, u.password_hash, r.name AS role_name " +
                 "FROM users u LEFT JOIN roles r ON u.role_id = r.id");
             ResultSet rs = stmt.executeQuery()) {
            while (rs.next()) {
                String pwd = rs.getString("password_hash");
                String pwdPreview = pwd == null ? "NULL" :
                    "BCRYPT(" + pwd.substring(0, 7) + "...)";
                log.info("  User[username='{}', status='{}', role='{}', password='{}']",
                    rs.getString("username"),
                    rs.getString("status"),
                    rs.getString("role_name"),
                    pwdPreview);
            }
        }
    }
}
