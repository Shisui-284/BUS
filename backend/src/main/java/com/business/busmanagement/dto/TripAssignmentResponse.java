package com.business.busmanagement.dto;

import com.business.busmanagement.model.TripAssignment;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class TripAssignmentResponse {
    private Long id;
    private Long employeeId;
    private String employeeName;
    private TripAssignment.AssignmentRole role;
}
