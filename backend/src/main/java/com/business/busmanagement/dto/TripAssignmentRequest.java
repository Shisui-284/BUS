package com.business.busmanagement.dto;

import com.business.busmanagement.model.TripAssignment;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class TripAssignmentRequest {

    @NotNull(message = "Trip id is required")
    private Long tripId;

    @NotNull(message = "Employee id is required")
    private Long employeeId;

    @NotNull(message = "Assignment role is required")
    private TripAssignment.AssignmentRole role;
}
