package com.business.busmanagement.model;

/* ============================================================
 * Bảng: feedbacks
 * Lưu khiếu nại / góp ý / khen của customer.
 * category: COMPLAINT / SUGGESTION / PRAISE / QUESTION / OTHER
 * status: NEW → READ → IN_PROGRESS → RESOLVED → CLOSED
 * priority: LOW / MEDIUM / HIGH
 * ============================================================ */

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "feedbacks")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Feedback {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(name = "category", nullable = false)
    private Category category;

    @Column(name = "subject", nullable = false, length = 150)
    private String subject;

    @Column(name = "content", nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(name = "related_trip_id")
    private Long relatedTripId;

    @Column(name = "rating")
    private Integer rating;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private Status status = Status.NEW;

    @Enumerated(EnumType.STRING)
    @Column(name = "priority")
    private Priority priority = Priority.MEDIUM;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @OneToMany(mappedBy = "feedback", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<FeedbackReply> replies = new ArrayList<>();

    public enum Category {
        COMPLAINT, SUGGESTION, PRAISE, QUESTION, OTHER
    }

    public enum Status {
        NEW, READ, IN_PROGRESS, RESOLVED, CLOSED
    }

    public enum Priority {
        LOW, MEDIUM, HIGH
    }
}