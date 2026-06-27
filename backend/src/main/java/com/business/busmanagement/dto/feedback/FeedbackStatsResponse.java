package com.business.busmanagement.dto.feedback;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class FeedbackStatsResponse {
    private long total;
    private long newCount;
    private long readCount;
    private long inProgressCount;
    private long resolvedCount;
    private long closedCount;
    private Map<String, Long> byCategory;
    private Double averageRating;
}