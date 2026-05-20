package com.business.busmanagement.dto;

import com.business.busmanagement.model.Payment;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class PayTicketRequest {
    @NotNull(message = "paymentMethod is required")
    private Payment.PaymentMethod paymentMethod;
}
