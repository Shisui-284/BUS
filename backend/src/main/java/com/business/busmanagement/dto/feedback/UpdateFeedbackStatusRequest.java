package com.business.busmanagement.dto.feedback;

import com.business.busmanagement.model.Feedback;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UpdateFeedbackStatusRequest {

    @NotNull(message = "Trạng thái không được để trống")
    private Feedback.Status status;

    private Feedback.Priority priority;
}