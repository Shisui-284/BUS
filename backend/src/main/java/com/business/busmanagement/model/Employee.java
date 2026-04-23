package com.business.busmanagement.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Entity
@Table(name = "employees")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Employee {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", unique = true)
    private User user;

    @Column(nullable = false)
    private String fullName;

    private String phone;

    @Enumerated(EnumType.STRING)
    @Column(name = "employee_type", columnDefinition = "ENUM('DRIVER', 'ASSISTANT', 'TECHNICIAN', 'DISPATCHER', 'MANAGER')", nullable = false)
    private EmployeeType employeeType;

    @Enumerated(EnumType.STRING)
    @Column(columnDefinition = "ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE'")
    private EmployeeStatus status = EmployeeStatus.ACTIVE;

    @OneToMany(mappedBy = "employee", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<TripAssignment> tripAssignments;

    public enum EmployeeType {
        DRIVER, ASSISTANT, TECHNICIAN, DISPATCHER, MANAGER
    }

    public enum EmployeeStatus {
        ACTIVE, INACTIVE
    }
}