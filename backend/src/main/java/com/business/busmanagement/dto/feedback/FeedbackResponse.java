package com.business.busmanagement.dto.feedback;

import com.business.busmanagement.model.Feedback;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class FeedbackResponse {
    private Long id;
    private Long userId;
    private String username;
    private String userFullName;
    private String userEmail;
    private Feedback.Category category;
    private String categoryLabel;
    private String subject;
    private String content;
    private Long relatedTripId;
    private String relatedTripLabel;
    private Integer rating;
    private Feedback.Status status;
    private String statusLabel;
    private Feedback.Priority priority;
    private String priorityLabel;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<FeedbackReplyResponse> replies;
    private int replyCount;
}