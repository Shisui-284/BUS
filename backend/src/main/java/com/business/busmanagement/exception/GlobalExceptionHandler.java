package com.business.busmanagement.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import lombok.extern.slf4j.Slf4j;
import java.util.Objects;

import java.time.LocalDateTime;

@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ApiErrorResponse> handleNotFound(ResourceNotFoundException ex) {
        return build(HttpStatus.NOT_FOUND, ex.getMessage());
    }

    @ExceptionHandler(BusinessConflictException.class)
    public ResponseEntity<ApiErrorResponse> handleConflict(BusinessConflictException ex) {
        return build(HttpStatus.CONFLICT, ex.getMessage());
    }

    @ExceptionHandler({IllegalArgumentException.class, MethodArgumentNotValidException.class})
    public ResponseEntity<ApiErrorResponse> handleBadRequest(Exception ex) {
        String message;
        if (ex instanceof MethodArgumentNotValidException validationEx) {
            var fieldError = validationEx.getBindingResult().getFieldError();
            message = Objects.requireNonNullElse(
                fieldError != null ? fieldError.getDefaultMessage() : null,
                "Invalid request payload"
            );
        } else {
            message = ex.getMessage();
        }
        return build(HttpStatus.BAD_REQUEST, message);
    }

    @ExceptionHandler(SecurityException.class)
    public ResponseEntity<ApiErrorResponse> handleUnauthorized(SecurityException ex) {
        return build(HttpStatus.UNAUTHORIZED, ex.getMessage());
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiErrorResponse> handleUnexpected(Exception ex) {
        log.error("Unexpected server error at /api/admin/trips", ex);
        String details = ex.getClass().getSimpleName() + ": " + ex.getMessage();
        if (ex.getCause() != null) {
            details += " | Cause: " + ex.getCause().getClass().getSimpleName() + ": " + ex.getCause().getMessage();
        }
        return build(HttpStatus.INTERNAL_SERVER_ERROR, details);
    }

    private ResponseEntity<ApiErrorResponse> build(HttpStatus status, String message) {
        HttpStatus safeStatus = Objects.requireNonNull(status, "status must not be null");
        return ResponseEntity.status(safeStatus).body(
                new ApiErrorResponse(
                        safeStatus.value(),
                        safeStatus.getReasonPhrase(),
                        message,
                        LocalDateTime.now()
                )
        );
    }
}
