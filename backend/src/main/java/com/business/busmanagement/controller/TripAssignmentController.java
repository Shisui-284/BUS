package com.business.busmanagement.controller;

import com.business.busmanagement.dto.TripAssignmentRequest;
import com.business.busmanagement.dto.TripAssignmentResponse;
import com.business.busmanagement.service.TripAssignmentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/trip-assignments")
@RequiredArgsConstructor
@CrossOrigin(origins = "${app.cors.allowed-origins}")
public class TripAssignmentController {

    private final TripAssignmentService tripAssignmentService;

    @PostMapping
    public ResponseEntity<TripAssignmentResponse> assign(@Valid @RequestBody TripAssignmentRequest request) {
        return ResponseEntity.ok(tripAssignmentService.assign(request));
    }
}
