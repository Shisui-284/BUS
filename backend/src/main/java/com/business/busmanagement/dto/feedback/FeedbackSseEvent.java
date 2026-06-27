package com.business.busmanagement.dto.feedback;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class FeedbackSseEvent {
    private Long feedbackId;
    private String username;
    private String userFullName;
    private String category;
    private String subject;
    private Integer rating;
    private LocalDateTime createdAt;
}