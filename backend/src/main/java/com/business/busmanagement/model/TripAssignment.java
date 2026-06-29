package com.business.busmanagement.model;

/* ============================================================
 * Bảng: trip_assignments
 * Phân công nhân sự cho chuyến (DRIVER / ASSISTANT).
 * ============================================================ */

import jakarta.persistence.*;

@Entity
@Table(name = "trip_assignments")
public class TripAssignment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Chỉ dùng Long ID để an toàn, không sợ lỗi Mapping với bảng Trip/Employee
    @Column(name = "trip_id", nullable = false)
    private Long tripId;

    @Column(name = "employee_id", nullable = false)
    private Long employeeId;

    @Enumerated(EnumType.STRING)
    @Column(name = "assignment_role", nullable = false)
    private AssignmentRole assignmentRole;

    public enum AssignmentRole {
        DRIVER, ASSISTANT
    }

    // --- GETTER VÀ SETTER ---
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getTripId() { return tripId; }
    public void setTripId(Long tripId) { this.tripId = tripId; }

    public Long getEmployeeId() { return employeeId; }
    public void setEmployeeId(Long employeeId) { this.employeeId = employeeId; }

    public AssignmentRole getAssignmentRole() { return assignmentRole; }
    public void setAssignmentRole(AssignmentRole assignmentRole) { this.assignmentRole = assignmentRole; }
}