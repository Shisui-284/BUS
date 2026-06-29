package com.business.busmanagement.service;

/* ============================================================
 * FEEDBACK SERVICE — Module: Khiếu nại / Phản hồi (Customer ↔ Admin)
 * Chức năng:
 *   - Customer: createFeedback, getMyFeedbacks, replyAsCustomer, closeAsCustomer
 *   - Admin:    getAllForAdmin, getStats, updateStatus, replyAsAdminByUsername, softDelete
 * Status flow: NEW → READ → IN_PROGRESS → RESOLVED → CLOSED
 * Category: COMPLAINT (khiếu nại), SUGGESTION, PRAISE, QUESTION, OTHER
 * ============================================================ */

import com.business.busmanagement.dto.feedback.*;
import com.business.busmanagement.exception.BusinessConflictException;
import com.business.busmanagement.exception.ResourceNotFoundException;
import com.business.busmanagement.model.Feedback;
import com.business.busmanagement.model.FeedbackReply;
import com.business.busmanagement.model.Trip;
import com.business.busmanagement.model.User;
import com.business.busmanagement.repository.FeedbackReplyRepository;
import com.business.busmanagement.repository.FeedbackRepository;
import com.business.busmanagement.repository.PassengerRepository;
import com.business.busmanagement.repository.TripRepository;
import com.business.busmanagement.repository.UserRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FeedbackService {

    private final FeedbackRepository feedbackRepository;
    private final FeedbackReplyRepository replyRepository;
    private final UserRepository userRepository;
    private final TripRepository tripRepository;
    private final PassengerRepository passengerRepository;
    private final AdminNotificationService notificationService;

    @PersistenceContext
    private EntityManager entityManager;

    // ==================== CUSTOMER ====================

    @Transactional
    public FeedbackResponse createFeedback(Long userId, CreateFeedbackRequest request) {
        User user = loadActiveUser(userId);

        if (request.getRating() != null && (request.getRating() < 1 || request.getRating() > 5)) {
            throw new BusinessConflictException("Rating phải nằm trong khoảng 1-5");
        }

        Feedback feedback = new Feedback();
        feedback.setUser(user);
        feedback.setCategory(request.getCategory());
        feedback.setSubject(request.getSubject());
        feedback.setContent(request.getContent());
        feedback.setRelatedTripId(request.getRelatedTripId());
        feedback.setRating(request.getRating());
        feedback.setStatus(Feedback.Status.NEW);
        feedback.setPriority(Feedback.Priority.MEDIUM);

        Feedback saved = feedbackRepository.save(feedback);

        // Broadcast tới admin qua SSE
        String fullName = passengerRepository.findByUserId(userId)
                .map(p -> p.getFullName()).orElse("");
        notificationService.broadcast("feedback.created", new FeedbackSseEvent(
                saved.getId(),
                user.getUsername(),
                fullName,
                saved.getCategory().name(),
                saved.getSubject(),
                saved.getRating(),
                saved.getCreatedAt()
        ));

        return toResponse(saved, true);
    }

    @Transactional(readOnly = true)
    public List<FeedbackResponse> getMyFeedbacks(Long userId) {
        return feedbackRepository.findAllByUserId(userId).stream()
                .map(f -> toResponse(f, true))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public FeedbackResponse getFeedbackForUser(Long userId, Long id) {
        Feedback feedback = feedbackRepository.findByIdWithReplies(id)
                .orElseThrow(() -> new ResourceNotFoundException("Feedback not found: " + id));

        if (!feedback.getUser().getId().equals(userId)) {
            throw new BusinessConflictException("Bạn không có quyền xem feedback này");
        }

        return toResponse(feedback, true);
    }

    @Transactional
    public FeedbackResponse replyAsCustomer(Long userId, Long id, CreateReplyRequest request) {
        Feedback feedback = feedbackRepository.findByIdWithReplies(id)
                .orElseThrow(() -> new ResourceNotFoundException("Feedback not found: " + id));

        if (!feedback.getUser().getId().equals(userId)) {
            throw new BusinessConflictException("Bạn không có quyền phản hồi feedback này");
        }

        if (feedback.getStatus() == Feedback.Status.CLOSED) {
            throw new BusinessConflictException("Feedback đã đóng, không thể phản hồi thêm");
        }

        User user = loadActiveUser(userId);

        FeedbackReply reply = new FeedbackReply();
        reply.setFeedback(feedback);
        reply.setAuthor(user);
        reply.setAuthorRole(FeedbackReply.AuthorRole.CUSTOMER);
        reply.setContent(request.getContent());
        replyRepository.save(reply);

        // Khi user follow-up, set lại status thành IN_PROGRESS để admin biết cần xem
        if (feedback.getStatus() == Feedback.Status.RESOLVED
                || feedback.getStatus() == Feedback.Status.READ) {
            feedback.setStatus(Feedback.Status.IN_PROGRESS);
            feedbackRepository.save(feedback);
        }

        // Detach để query lại từ DB, tránh cache trả về replies cũ
        entityManager.flush();
        entityManager.clear();
        Feedback reloaded = feedbackRepository.findByIdWithReplies(id).orElseThrow();
        return toResponse(reloaded, true);
    }

    @Transactional
    public FeedbackResponse closeAsCustomer(Long userId, Long id) {
        Feedback feedback = feedbackRepository.findByIdWithReplies(id)
                .orElseThrow(() -> new ResourceNotFoundException("Feedback not found: " + id));

        if (!feedback.getUser().getId().equals(userId)) {
            throw new BusinessConflictException("Bạn không có quyền đóng feedback này");
        }

        if (feedback.getStatus() == Feedback.Status.CLOSED) {
            throw new BusinessConflictException("Feedback đã được đóng trước đó");
        }

        feedback.setStatus(Feedback.Status.CLOSED);
        feedbackRepository.save(feedback);

        return toResponse(feedback, true);
    }

    // ==================== ADMIN ====================

    @Transactional(readOnly = true)
    public List<FeedbackResponse> getAllForAdmin(Feedback.Status status, Feedback.Category category, Long tripId, String keyword) {
        return feedbackRepository.findAllAdmin(status, category, tripId, keyword).stream()
                .map(f -> toResponse(f, true))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public FeedbackResponse getByIdForAdmin(Long id) {
        Feedback feedback = feedbackRepository.findByIdWithReplies(id)
                .orElseThrow(() -> new ResourceNotFoundException("Feedback not found: " + id));

        // Mark as READ nếu admin mở xem
        if (feedback.getStatus() == Feedback.Status.NEW) {
            feedback.setStatus(Feedback.Status.READ);
            feedbackRepository.save(feedback);
        }

        return toResponse(feedback, true);
    }

    @Transactional
    public FeedbackResponse updateStatus(Long id, UpdateFeedbackStatusRequest request) {
        Feedback feedback = feedbackRepository.findByIdWithReplies(id)
                .orElseThrow(() -> new ResourceNotFoundException("Feedback not found: " + id));

        feedback.setStatus(request.getStatus());
        if (request.getPriority() != null) {
            feedback.setPriority(request.getPriority());
        }

        Feedback saved = feedbackRepository.save(feedback);
        return toResponse(saved, true);
    }

    @Transactional
    public FeedbackResponse replyAsAdmin(Long adminId, Long id, CreateReplyRequest request) {
        Feedback feedback = feedbackRepository.findByIdWithReplies(id)
                .orElseThrow(() -> new ResourceNotFoundException("Feedback not found: " + id));

        User admin = loadActiveUser(adminId);

        FeedbackReply reply = new FeedbackReply();
        reply.setFeedback(feedback);
        reply.setAuthor(admin);
        reply.setAuthorRole(FeedbackReply.AuthorRole.ADMIN);
        reply.setContent(request.getContent());
        replyRepository.save(reply);

        // Admin trả lời → chuyển status sang IN_PROGRESS (trừ khi admin chọn RESOLVED)
        if (feedback.getStatus() == Feedback.Status.NEW
                || feedback.getStatus() == Feedback.Status.READ) {
            feedback.setStatus(Feedback.Status.IN_PROGRESS);
        }
        feedbackRepository.save(feedback);

        entityManager.flush();
        entityManager.clear();
        Feedback reloaded = feedbackRepository.findByIdWithReplies(id).orElseThrow();
        return toResponse(reloaded, true);
    }

    @Transactional
    public FeedbackResponse replyAsAdminByUsername(String adminUsername, Long id, CreateReplyRequest request) {
        User admin = userRepository.findByUsername(adminUsername)
                .orElseThrow(() -> new ResourceNotFoundException("Admin not found: " + adminUsername));
        return replyAsAdmin(admin.getId(), id, request);
    }

    @Transactional
    public void softDelete(Long id) {
        Feedback feedback = feedbackRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Feedback not found: " + id));

        if (feedback.getDeletedAt() != null) {
            throw new BusinessConflictException("Feedback đã được xóa trước đó");
        }

        feedback.setDeletedAt(LocalDateTime.now());
        feedbackRepository.save(feedback);
    }

    @Transactional(readOnly = true)
    public FeedbackStatsResponse getStats() {
        List<Feedback> all = feedbackRepository.findAll().stream()
                .filter(f -> f.getDeletedAt() == null)
                .collect(Collectors.toList());

        Map<Feedback.Status, Long> byStatus = all.stream()
                .collect(Collectors.groupingBy(Feedback::getStatus, Collectors.counting()));

        Map<String, Long> byCategory = new LinkedHashMap<>();
        for (Feedback.Category c : Feedback.Category.values()) {
            byCategory.put(c.name(), all.stream().filter(f -> f.getCategory() == c).count());
        }

        Double avgRating = all.stream()
                .filter(f -> f.getRating() != null)
                .mapToInt(Feedback::getRating)
                .average()
                .stream().boxed()
                .findFirst().orElse(null);

        return new FeedbackStatsResponse(
                all.size(),
                byStatus.getOrDefault(Feedback.Status.NEW, 0L),
                byStatus.getOrDefault(Feedback.Status.READ, 0L),
                byStatus.getOrDefault(Feedback.Status.IN_PROGRESS, 0L),
                byStatus.getOrDefault(Feedback.Status.RESOLVED, 0L),
                byStatus.getOrDefault(Feedback.Status.CLOSED, 0L),
                byCategory,
                avgRating
        );
    }

    // ==================== MAPPER ====================

    private User loadActiveUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));
        if (user.getStatus() == User.UserStatus.INACTIVE) {
            throw new BusinessConflictException("Tài khoản đã bị vô hiệu hóa");
        }
        return user;
    }

    private FeedbackResponse toResponse(Feedback f, boolean includeReplies) {
        String fullName = "";
        if (f.getUser() != null) {
            fullName = passengerRepository.findByUserId(f.getUser().getId())
                    .map(p -> p.getFullName()).orElse(f.getUser().getUsername());
        }

        String tripLabel = null;
        if (f.getRelatedTripId() != null) {
            tripLabel = tripRepository.findById(f.getRelatedTripId())
                    .map(this::formatTripLabel).orElse("Chuyến #" + f.getRelatedTripId());
        }

        List<FeedbackReplyResponse> replyResponses = null;
        int replyCount = 0;
        if (f.getReplies() != null) {
            replyCount = f.getReplies().size();
            if (includeReplies) {
                replyResponses = f.getReplies().stream()
                        .sorted((a, b) -> a.getCreatedAt().compareTo(b.getCreatedAt()))
                        .map(this::toReplyResponse)
                        .collect(Collectors.toList());
            }
        }

        return new FeedbackResponse(
                f.getId(),
                f.getUser() != null ? f.getUser().getId() : null,
                f.getUser() != null ? f.getUser().getUsername() : "",
                fullName,
                f.getUser() != null ? f.getUser().getEmail() : "",
                f.getCategory(),
                categoryLabel(f.getCategory()),
                f.getSubject(),
                f.getContent(),
                f.getRelatedTripId(),
                tripLabel,
                f.getRating(),
                f.getStatus(),
                statusLabel(f.getStatus()),
                f.getPriority(),
                priorityLabel(f.getPriority()),
                f.getCreatedAt(),
                f.getUpdatedAt(),
                replyResponses,
                replyCount
        );
    }

    private FeedbackReplyResponse toReplyResponse(FeedbackReply r) {
        String fullName = "";
        if (r.getAuthor() != null) {
            fullName = passengerRepository.findByUserId(r.getAuthor().getId())
                    .map(p -> p.getFullName()).orElse(r.getAuthor().getUsername());
        }
        return new FeedbackReplyResponse(
                r.getId(),
                r.getAuthor() != null ? r.getAuthor().getId() : null,
                r.getAuthor() != null ? r.getAuthor().getUsername() : "",
                fullName,
                r.getAuthorRole(),
                r.getContent(),
                r.getCreatedAt()
        );
    }

    private String formatTripLabel(Trip trip) {
        String route = "";
        if (trip.getRoute() != null) {
            route = trip.getRoute().getOrigin() + " → " + trip.getRoute().getDestination();
        }
        String date = trip.getDepartureTime() != null
                ? trip.getDepartureTime().toLocalDate().toString()
                : "";
        return (route.isEmpty() ? "Chuyến #" + trip.getId() : route) + (date.isEmpty() ? "" : " · " + date);
    }

    private String categoryLabel(Feedback.Category c) {
        if (c == null) return "";
        return switch (c) {
            case COMPLAINT -> "Khiếu nại";
            case SUGGESTION -> "Góp ý";
            case PRAISE -> "Khen ngợi";
            case QUESTION -> "Câu hỏi";
            case OTHER -> "Khác";
        };
    }

    private String statusLabel(Feedback.Status s) {
        if (s == null) return "";
        return switch (s) {
            case NEW -> "Mới";
            case READ -> "Đã đọc";
            case IN_PROGRESS -> "Đang xử lý";
            case RESOLVED -> "Đã giải quyết";
            case CLOSED -> "Đã đóng";
        };
    }

    private String priorityLabel(Feedback.Priority p) {
        if (p == null) return "";
        return switch (p) {
            case LOW -> "Thấp";
            case MEDIUM -> "Trung bình";
            case HIGH -> "Cao";
        };
    }
}