package com.business.busmanagement.model;

/* ============================================================
 * Bảng: audit_logs
 * Ghi log hoạt động (login, tạo user, thanh toán...).
 * ============================================================ */

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "audit_logs")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id")
    private Long userId;

    @Column(name = "action", length = 20)
    private String action;

    @Column(name = "table_name", length = 50)
    private String tableName;

    @Column(name = "record_id")
    private Long recordId;

    @Column(name = "old_values", columnDefinition = "JSON")
    private String oldValues;

    @Column(name = "new_values", columnDefinition = "JSON")
    private String newValues;

    @CreationTimestamp
    @Column(name = "timestamp")
    private LocalDateTime timestamp;
}