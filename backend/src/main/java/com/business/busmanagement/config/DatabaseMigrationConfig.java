package com.business.busmanagement.config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;

@Configuration
public class DatabaseMigrationConfig {

    @Bean
    public CommandLineRunner alterDatabaseColumns(JdbcTemplate jdbcTemplate) {
        return args -> {
            try {
                jdbcTemplate.execute("ALTER TABLE tickets MODIFY COLUMN status VARCHAR(50) NOT NULL");
                System.out.println("Altered tickets status column to VARCHAR(50)");
            } catch (Exception e) {
                System.out.println("Failed to alter tickets status column: " + e.getMessage());
            }
            try {
                jdbcTemplate.execute("ALTER TABLE payments MODIFY COLUMN payment_method VARCHAR(50) NOT NULL");
                System.out.println("Altered payments payment_method column to VARCHAR(50)");
            } catch (Exception e) {
                System.out.println("Failed to alter payments payment_method column: " + e.getMessage());
            }
        };
    }
}
