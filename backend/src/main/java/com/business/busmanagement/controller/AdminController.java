package com.business.busmanagement.controller;
import com.business.busmanagement.dto.AdminTicketDTO;

import com.business.busmanagement.dto.TripCreateRequest;
import com.business.busmanagement.dto.TripResponse;
import com.business.busmanagement.dto.admin.*;
import com.business.busmanagement.model.Trip;
import com.business.busmanagement.repository.TicketRepository;
import com.business.busmanagement.service.AdminNotificationService;
import com.business.busmanagement.service.AdminService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@CrossOrigin(origins = "${app.cors.allowed-origins}")
public class AdminController {
    @Autowired
    private TicketRepository ticketRepository;
    private final AdminService adminService;
    private final AdminNotificationService notificationService;

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

    @DeleteMapping("/buses/{id}")
    public ResponseEntity<Map<String, String>> deleteBus(@PathVariable Long id) {
        adminService.deleteBus(id);
        return ResponseEntity.ok(Map.of("message", "Bus deleted successfully"));
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

    @DeleteMapping("/routes/{id}")
    public ResponseEntity<Map<String, String>> deleteRoute(@PathVariable Long id) {
        adminService.deleteRoute(id);
        return ResponseEntity.ok(Map.of("message", "Route deleted successfully"));
    }

    // ==================== TRIP MANAGEMENT ====================

    @GetMapping("/trips")
    public ResponseEntity<List<TripResponse>> getTrips(
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) java.time.LocalDate date,
            @RequestParam(required = false) Long routeId,
            @RequestParam(required = false) Trip.TripStatus status) {
        return ResponseEntity.ok(adminService.getTrips(date, routeId, status));
    }

    @GetMapping("/trips/{id}")
    public ResponseEntity<TripDetailResponse> getTripById(@PathVariable Long id) {
        return ResponseEntity.ok(adminService.getTripById(id));
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

    // ==================== TICKET MANAGEMENT ====================

    @GetMapping("/tickets")
    public ResponseEntity<List<TicketListResponse>> getTickets(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Long tripId) {
        return ResponseEntity.ok(adminService.getTickets(keyword, status, tripId));
    }

    @GetMapping("/tickets/{id}")
    public ResponseEntity<TicketDetailResponse> getTicketById(@PathVariable Long id) {
        return ResponseEntity.ok(adminService.getTicketById(id));
    }

    @GetMapping("/tickets/all")
public ResponseEntity<List<AdminTicketDTO>> getAllTickets() {
    List<AdminTicketDTO> tickets = ticketRepository.findAllTicketsForAdmin();
    return ResponseEntity.ok(tickets);
}

    // ==================== TICKET ACTIONS ====================

    @PutMapping("/tickets/{id}/confirm")
    public ResponseEntity<TicketDetailResponse> confirmTicket(@PathVariable Long id) {
        return ResponseEntity.ok(adminService.confirmTicket(id));
    }

    @PutMapping("/tickets/{id}/admin-cancel")
    public ResponseEntity<TicketDetailResponse> adminCancelTicket(@PathVariable Long id) {
        return ResponseEntity.ok(adminService.adminCancelTicket(id));
    }

    // ==================== REAL-TIME NOTIFICATION (SSE) ====================

    /**
     * SSE endpoint cho admin nhận notification real-time.
     *
     * Event names:
     *   - "booking.created"   — user đặt vé mới (COD), admin cần gọi điện xác nhận
     *   - "payment.vnpay.success" — user thanh toán VNPay thành công, admin cần xác nhận lại
     *
     * Kết nối bằng EventSource('/api/admin/notifications/stream') trên browser.
     */
    @GetMapping(value = "/notifications/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamNotifications() {
        return notificationService.register();
    }
}