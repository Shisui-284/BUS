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

    /**
     * 401 Unauthorized — chưa đăng nhập / token không hợp lệ / user không tồn tại.
     * Dùng khi xác thực thất bại (authentication failure).
     */
    @ExceptionHandler(UnauthorizedException.class)
    public ResponseEntity<ApiErrorResponse> handleUnauthorized(UnauthorizedException ex) {
        return build(HttpStatus.UNAUTHORIZED, ex.getMessage());
    }

    /**
     * 403 Forbidden — đã đăng nhập nhưng KHÔNG CÓ QUYỀN thực hiện hành động.
     * Ví dụ: user cố truy cập vé của người khác, cố truy cập admin endpoint.
     */
    @ExceptionHandler(SecurityException.class)
    public ResponseEntity<ApiErrorResponse> handleForbidden(SecurityException ex) {
        // SecurityException từ application code = authorization error = 403 Forbidden
        // (không phải 401 vì 401 = chưa đăng nhập)
        return build(HttpStatus.FORBIDDEN, ex.getMessage());
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiErrorResponse> handleUnexpected(Exception ex) {
        // Log đầy đủ exception với request context
        log.error("Unexpected server error", ex);
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
