package com.business.busmanagement.repository;

import com.business.busmanagement.model.TripAssignment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface TripAssignmentRepository extends JpaRepository<TripAssignment, Long> {

    List<TripAssignment> findByTripId(Long tripId);

    Optional<TripAssignment> findByTripIdAndAssignmentRole(Long tripId, TripAssignment.AssignmentRole assignmentRole);

    @Query("""
        SELECT ta FROM TripAssignment ta
        WHERE ta.employee.id = :employeeId
          AND ta.trip.id <> :tripId
          AND ta.trip.departureTime < :targetEnd
          AND ta.trip.arrivalTime > :targetStart
        """)
    List<TripAssignment> findConflictingAssignments(
            @Param("employeeId") Long employeeId,
            @Param("tripId") Long tripId,
            @Param("targetStart") LocalDateTime targetStart,
            @Param("targetEnd") LocalDateTime targetEnd
    );

    @Query("""
        SELECT DISTINCT ta.employee.id FROM TripAssignment ta
        WHERE ta.trip.departureTime < :targetEnd
          AND ta.trip.arrivalTime > :targetStart
        """)
    List<Long> findBusyEmployeeIds(
            @Param("targetStart") LocalDateTime targetStart,
            @Param("targetEnd") LocalDateTime targetEnd
    );
}
