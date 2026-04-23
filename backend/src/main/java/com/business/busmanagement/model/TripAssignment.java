package com.business.busmanagement.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "trip_assignments", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"trip_id", "employee_id"}),
        @UniqueConstraint(columnNames = {"trip_id", "assignment_role"})
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class TripAssignment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "trip_id", nullable = false)
    private Trip trip;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id")
    private Employee employee;

    @Enumerated(EnumType.STRING)
    @Column(name = "assignment_role", columnDefinition = "ENUM('DRIVER', 'ASSISTANT')")
    private AssignmentRole assignmentRole;

    @CreationTimestamp
    @Column(name = "assigned_at")
    private LocalDateTime assignedAt;

    public enum AssignmentRole {
        DRIVER, ASSISTANT
    }
}