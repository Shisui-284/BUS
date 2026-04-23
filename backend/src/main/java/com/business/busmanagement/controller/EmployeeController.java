package com.business.busmanagement.controller;

import com.business.busmanagement.dto.EmployeeAvailableResponse;
import com.business.busmanagement.model.TripAssignment;
import com.business.busmanagement.service.TripAssignmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/employees")
@RequiredArgsConstructor
@CrossOrigin(origins = "${app.cors.allowed-origins}")
public class EmployeeController {

    private final TripAssignmentService tripAssignmentService;

    @GetMapping("/available")
    public ResponseEntity<List<EmployeeAvailableResponse>> getAvailableEmployees(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to,
            @RequestParam TripAssignment.AssignmentRole role
    ) {
        return ResponseEntity.ok(tripAssignmentService.getAvailableEmployees(from, to, role));
    }
}
