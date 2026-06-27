package com.business.busmanagement.dto.feedback;

import com.business.busmanagement.model.FeedbackReply;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class FeedbackReplyResponse {
    private Long id;
    private Long authorId;
    private String authorUsername;
    private String authorFullName;
    private FeedbackReply.AuthorRole authorRole;
    private String content;
    private LocalDateTime createdAt;
}