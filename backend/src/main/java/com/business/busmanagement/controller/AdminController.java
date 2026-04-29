package com.business.busmanagement.controller;

import com.business.busmanagement.dto.TripCreateRequest;
import com.business.busmanagement.dto.TripResponse;
import com.business.busmanagement.dto.admin.*;
import com.business.busmanagement.model.Trip;
import com.business.busmanagement.service.AdminService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@CrossOrigin(origins = "${app.cors.allowed-origins}")
public class AdminController {

    private final AdminService adminService;

    // ==================== DASHBOARD ====================

    @GetMapping("/dashboard")
    public ResponseEntity<AdminDashboardResponse> getDashboard() {
        return ResponseEntity.ok(adminService.getDashboard());
    }

    // ==================== USER MANAGEMENT ====================

    @GetMapping("/users")
    public ResponseEntity<List<UserListResponse>> getUsers(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String role,
            @RequestParam(required = false) String status) {
        return ResponseEntity.ok(adminService.getUsers(keyword, role, status));
    }

    @GetMapping("/users/{id}")
    public ResponseEntity<UserDetailResponse> getUserById(@PathVariable Long id) {
        return ResponseEntity.ok(adminService.getUserById(id));
    }

    @PostMapping("/users")
    public ResponseEntity<UserDetailResponse> createUser(@Valid @RequestBody CreateUserRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(adminService.createUser(request));
    }

    @PutMapping("/users/{id}")
    public ResponseEntity<UserDetailResponse> updateUser(
            @PathVariable Long id,
            @Valid @RequestBody UpdateUserRequest request) {
        return ResponseEntity.ok(adminService.updateUser(id, request));
    }

    @PutMapping("/users/{id}/lock")
    public ResponseEntity<UserDetailResponse> lockUnlockUser(@PathVariable Long id) {
        return ResponseEntity.ok(adminService.lockUnlockUser(id));
    }

    @PutMapping("/users/{id}/password")
    public ResponseEntity<Map<String, String>> resetPassword(
            @PathVariable Long id,
            @Valid @RequestBody ResetPasswordRequest request) {
        adminService.resetUserPassword(id, request.getNewPassword());
        return ResponseEntity.ok(Map.of("message", "Password updated successfully"));
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<Map<String, String>> deleteUser(@PathVariable Long id) {
        adminService.deleteUser(id);
        return ResponseEntity.ok(Map.of("message", "User deleted successfully"));
    }

    // ==================== BUS MANAGEMENT ====================

    @GetMapping("/buses")
    public ResponseEntity<List<BusListResponse>> getBuses(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String status) {
        return ResponseEntity.ok(adminService.getBuses(keyword, status));
    }

    @GetMapping("/buses/{id}")
    public ResponseEntity<BusDetailResponse> getBusById(@PathVariable Long id) {
        return ResponseEntity.ok(adminService.getBusById(id));
    }

    @PostMapping("/buses")
    public ResponseEntity<BusDetailResponse> createBus(@Valid @RequestBody CreateBusRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(adminService.createBus(request));
    }

    @PutMapping("/buses/{id}")
    public ResponseEntity<BusDetailResponse> updateBus(
            @PathVariable Long id,
            @Valid @RequestBody UpdateBusRequest request) {
        return ResponseEntity.ok(adminService.updateBus(id, request));
    }

    @PutMapping("/buses/{id}/status")
    public ResponseEntity<BusDetailResponse> updateBusStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        String status = body.get("status");

        if (status == null || status.isBlank()) {
            return ResponseEntity.badRequest().build();
        }

        return ResponseEntity.ok(adminService.updateBusStatus(id, status));
    }

    // ==================== ROUTE MANAGEMENT ====================

    @GetMapping("/routes")
    public ResponseEntity<List<RouteListResponse>> getRoutes(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Boolean activeOnly) {
        return ResponseEntity.ok(adminService.getRoutes(keyword, activeOnly));
    }

    @GetMapping("/routes/{id}")
    public ResponseEntity<RouteDetailResponse> getRouteById(@PathVariable Long id) {
        return ResponseEntity.ok(adminService.getRouteById(id));
    }

    @PostMapping("/routes")
    public ResponseEntity<RouteDetailResponse> createRoute(@Valid @RequestBody CreateRouteRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(adminService.createRoute(request));
    }

    @PutMapping("/routes/{id}")
    public ResponseEntity<RouteDetailResponse> updateRoute(
            @PathVariable Long id,
            @Valid @RequestBody UpdateRouteRequest request) {
        return ResponseEntity.ok(adminService.updateRoute(id, request));
    }

    // ==================== TRIP MANAGEMENT ====================

    @GetMapping("/trips")
    public ResponseEntity<List<TripResponse>> getTrips(
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) java.time.LocalDate date,
            @RequestParam(required = false) Long routeId,
            @RequestParam(required = false) Trip.TripStatus status) {
        return ResponseEntity.ok(adminService.getTrips(date, routeId, status));
    }

    @PostMapping("/trips")
    public ResponseEntity<TripResponse> createTrip(@Valid @RequestBody TripCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(adminService.createTrip(request));
    }

    @PutMapping("/trips/{id}")
    public ResponseEntity<TripResponse> updateTrip(
            @PathVariable Long id,
            @Valid @RequestBody TripCreateRequest request) {
        return ResponseEntity.ok(adminService.updateTrip(id, request));
    }

    @DeleteMapping("/trips/{id}")
    public ResponseEntity<Map<String, String>> deleteTrip(@PathVariable Long id) {
        adminService.deleteTrip(id);
        return ResponseEntity.ok(Map.of("message", "Trip deleted successfully"));
    }
}