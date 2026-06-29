package com.business.busmanagement.controller;

/* ============================================================
 * FEEDBACK CONTROLLER (Customer) — Module: Khiếu nại / Phản hồi
 * Endpoint (cần đăng nhập CUSTOMER):
 *   POST /api/private/feedbacks              → tạo feedback mới
 *   GET  /api/private/feedbacks/me           → DS feedback của tôi
 *   GET  /api/private/feedbacks/{id}         → chi tiết feedback
 *   POST /api/private/feedbacks/{id}/reply   → customer reply
 *   PUT  /api/private/feedbacks/{id}/close   → đóng feedback
 * ============================================================ */

import com.business.busmanagement.dto.feedback.*;
import com.business.busmanagement.model.User;
import com.business.busmanagement.service.FeedbackService;
import com.business.busmanagement.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/private/feedbacks")
@RequiredArgsConstructor
@CrossOrigin(origins = "${app.cors.allowed-origins}")
public class FeedbackController {

    private final FeedbackService feedbackService;
    private final UserService userService;

    @PostMapping
    public ResponseEntity<FeedbackResponse> createFeedback(@Valid @RequestBody CreateFeedbackRequest request) {
        User user = currentUser();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(feedbackService.createFeedback(user.getId(), request));
    }

    @GetMapping("/me")
    public ResponseEntity<List<FeedbackResponse>> getMyFeedbacks() {
        User user = currentUser();
        return ResponseEntity.ok(feedbackService.getMyFeedbacks(user.getId()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<FeedbackResponse> getMyFeedbackById(@PathVariable Long id) {
        User user = currentUser();
        return ResponseEntity.ok(feedbackService.getFeedbackForUser(user.getId(), id));
    }

    @PostMapping("/{id}/reply")
    public ResponseEntity<FeedbackResponse> reply(@PathVariable Long id,
                                                  @Valid @RequestBody CreateReplyRequest request) {
        User user = currentUser();
        return ResponseEntity.ok(feedbackService.replyAsCustomer(user.getId(), id, request));
    }

    @PutMapping("/{id}/close")
    public ResponseEntity<FeedbackResponse> close(@PathVariable Long id) {
        User user = currentUser();
        return ResponseEntity.ok(feedbackService.closeAsCustomer(user.getId(), id));
    }

    private User currentUser() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return userService.findByUsername(username)
                .orElseThrow(() -> new SecurityException("User not found"));
    }
}