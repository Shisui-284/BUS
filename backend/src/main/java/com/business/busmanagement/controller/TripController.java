package com.business.busmanagement.controller;

/* ============================================================
 * TRIP CONTROLLER — Module: Quản lý chuyến xe (Admin)
 * Endpoint:
 *   GET  /api/trips?date=&routeId=&status=  → DS chuyến (lọc theo ngày/tuyến/trạng thái)
 *   POST /api/trips                          → tạo chuyến mới
 * ============================================================ */

import com.business.busmanagement.dto.TripCreateRequest;
import com.business.busmanagement.dto.TripResponse;
import com.business.busmanagement.model.Trip;
import com.business.busmanagement.service.TripService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/trips")
@RequiredArgsConstructor
@CrossOrigin(origins = "${app.cors.allowed-origins}")
public class TripController {

    private final TripService tripService;

    // GET /api/trips — Admin lấy DS chuyến, có thể lọc theo date/route/status
    @GetMapping
    public ResponseEntity<List<TripResponse>> getTrips(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate date,
            @RequestParam(required = false) Long routeId,
            @RequestParam(required = false) Trip.TripStatus status
    ) {
        return ResponseEntity.ok(tripService.getTrips(date, routeId, status));
    }

    // POST /api/trips — Admin tạo chuyến mới (gán bus, driver, route)
    @PostMapping
    public ResponseEntity<TripResponse> createTrip(@Valid @RequestBody TripCreateRequest request) {
        return ResponseEntity.ok(tripService.createTrip(request));
    }
}
