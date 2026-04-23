package com.business.busmanagement.service;

import com.business.busmanagement.dto.EmployeeAvailableResponse;
import com.business.busmanagement.dto.TripAssignmentRequest;
import com.business.busmanagement.dto.TripAssignmentResponse;
import com.business.busmanagement.exception.BusinessConflictException;
import com.business.busmanagement.exception.ResourceNotFoundException;
import com.business.busmanagement.model.Employee;
import com.business.busmanagement.model.Trip;
import com.business.busmanagement.model.TripAssignment;
import com.business.busmanagement.repository.EmployeeRepository;
import com.business.busmanagement.repository.TripAssignmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class TripAssignmentService {

    private final TripAssignmentRepository tripAssignmentRepository;
    private final EmployeeRepository employeeRepository;
    private final TripService tripService;

    @Transactional
    public TripAssignmentResponse assign(TripAssignmentRequest request) {
        Trip trip = tripService.getTripEntity(request.getTripId());
        Long employeeId = Objects.requireNonNull(request.getEmployeeId(), "employeeId is required");
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found"));

        validateRoleCompatibility(employee, request.getRole());
        validateOverlap(trip, employee);

        TripAssignment assignment = tripAssignmentRepository
                .findByTripIdAndAssignmentRole(trip.getId(), request.getRole())
                .orElseGet(TripAssignment::new);

        assignment.setTrip(trip);
        assignment.setEmployee(employee);
        assignment.setAssignmentRole(request.getRole());

        TripAssignment saved = tripAssignmentRepository.save(assignment);

        return new TripAssignmentResponse(
                saved.getId(),
                employee.getId(),
                employee.getFullName(),
                saved.getAssignmentRole()
        );
    }

    @Transactional(readOnly = true)
    public List<EmployeeAvailableResponse> getAvailableEmployees(
            LocalDateTime from,
            LocalDateTime to,
            TripAssignment.AssignmentRole role
    ) {
        if (from == null || to == null) {
            throw new IllegalArgumentException("from and to are required");
        }
        if (!from.isBefore(to)) {
            throw new IllegalArgumentException("from must be before to");
        }

        Employee.EmployeeType employeeType = mapToEmployeeType(role);
        List<Employee> candidates = employeeRepository.findByEmployeeTypeAndStatus(
                employeeType,
                Employee.EmployeeStatus.ACTIVE
        );

        Set<Long> busyEmployeeIds = Set.copyOf(tripAssignmentRepository.findBusyEmployeeIds(from, to));

        return candidates.stream()
                .filter(employee -> !busyEmployeeIds.contains(employee.getId()))
                .map(employee -> new EmployeeAvailableResponse(
                        employee.getId(),
                        employee.getFullName(),
                        employee.getEmployeeType()
                ))
                .toList();
    }

    private void validateOverlap(Trip trip, Employee employee) {
        LocalDateTime start = trip.getDepartureTime();
        LocalDateTime end = trip.getArrivalTime();

        if (start == null || end == null) {
            throw new IllegalArgumentException("Trip departure/arrival time is required for assignment");
        }

        boolean hasConflict = !tripAssignmentRepository.findConflictingAssignments(
                employee.getId(),
                trip.getId(),
                start,
                end
        ).isEmpty();

        if (hasConflict) {
            throw new BusinessConflictException("Nhân sự đang bận ở chuyến khác trong khung giờ này");
        }
    }

    private void validateRoleCompatibility(Employee employee, TripAssignment.AssignmentRole role) {
        Employee.EmployeeType expectedType = mapToEmployeeType(role);

        if (employee.getEmployeeType() != expectedType) {
            throw new IllegalArgumentException("Employee type does not match assignment role");
        }
        if (employee.getStatus() != Employee.EmployeeStatus.ACTIVE) {
            throw new IllegalArgumentException("Employee is not active");
        }
    }

    private Employee.EmployeeType mapToEmployeeType(TripAssignment.AssignmentRole role) {
        return switch (role) {
            case DRIVER -> Employee.EmployeeType.DRIVER;
            case ASSISTANT -> Employee.EmployeeType.ASSISTANT;
        };
    }
}
