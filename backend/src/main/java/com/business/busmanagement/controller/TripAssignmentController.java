package com.business.busmanagement.controller;

/* ============================================================
 * TRIP ASSIGNMENT CONTROLLER — Module: Phân công nhân sự cho chuyến
 * Endpoint:
 *   POST /api/admin/trip-assignments/{tripId}  → gán tài xế + phụ xe
 *   GET  /api/admin/trip-assignments/{tripId}  → DS nhân sự của chuyến
 * ============================================================ */

import com.business.busmanagement.model.TripAssignment;
import com.business.busmanagement.repository.TripAssignmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
import java.util.List;

@RestController
@RequestMapping("/api/admin/trip-assignments")
@RequiredArgsConstructor
@CrossOrigin(origins = "${app.cors.allowed-origins}")
public class TripAssignmentController {

    private final TripAssignmentRepository assignmentRepository;

    @PostMapping("/{tripId}")
    public ResponseEntity<?> assignStaff(@PathVariable Long tripId, @RequestBody Map<String, Long> payload) {
        // 1. Xóa phân công cũ của chuyến này (để tránh bị trùng lặp khi cập nhật)
        assignmentRepository.deleteByTripId(tripId);

        // 2. Lấy ID tài xế và phụ xe từ Frontend gửi lên
        Long driverId = payload.get("driverId");
        Long assistantId = payload.get("assistantId");

        // 3. Lưu Tài xế
        if (driverId != null) {
            TripAssignment driver = new TripAssignment();
            driver.setTripId(tripId);
            driver.setEmployeeId(driverId);
            driver.setAssignmentRole(TripAssignment.AssignmentRole.DRIVER);
            assignmentRepository.save(driver);
        }

        // 4. Lưu Phụ xe
        if (assistantId != null) {
            TripAssignment assistant = new TripAssignment();
            assistant.setTripId(tripId);
            assistant.setEmployeeId(assistantId);
            assistant.setAssignmentRole(TripAssignment.AssignmentRole.ASSISTANT);
            assignmentRepository.save(assistant);
        }

        return ResponseEntity.ok("Phân công nhân sự thành công!");
    }
    @GetMapping("/{tripId}")
    public ResponseEntity<List<TripAssignment>> getStaffByTrip(@PathVariable Long tripId) {
        return ResponseEntity.ok(assignmentRepository.findByTripId(tripId));
    }
}