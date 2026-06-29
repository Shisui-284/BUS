package com.business.busmanagement.service;

/* ============================================================
 * ADMIN NOTIFICATION SERVICE — Module: SSE Real-time Notification
 * Singleton broadcaster đẩy notification real-time tới admin khi:
 *   - User đặt vé mới (COD)
 *   - User thanh toán VNPay thành công
 *   - User gửi feedback mới
 * Tại sao SSE thay vì WebSocket:
 *   - Đơn chiều (server → client) — đủ cho notification
 *   - HTTP thuần, không cần thêm dependency
 *   - Auto-reconnect có sẵn ở EventSource API
 * ============================================================ */

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * Singleton broadcaster cho Server-Sent Events (SSE).
 *
 * <p>Mục đích: đẩy real-time notification tới admin khi:
 * <ul>
 *   <li>User đặt vé mới (COD) — admin cần gọi điện xác nhận</li>
 *   <li>User thanh toán VNPay thành công (IPN callback) — admin cần xác nhận lại</li>
 * </ul>
 *
 * <p>Tại sao SSE thay vì WebSocket:
 * <ul>
 *   <li>Đơn chiều (server → client) — đủ cho notification</li>
 *   <li>Dùng HTTP thuần, không cần thêm dependency</li>
 *   <li>Auto-reconnect có sẵn ở EventSource API của browser</li>
 * </ul>
 */
@Service
@Slf4j
public class AdminNotificationService {

    /** Danh sách tất cả admin đang subscribe. Thread-safe. */
    private final List<SseEmitter> emitters = new CopyOnWriteArrayList<>();

    /** Tạo emitter mới cho 1 admin client. Timeout 30 phút (Spring default). */
    public SseEmitter register() {
        // 0L = no timeout; default 30s của Spring. Dùng 30 phút cho tab admin.
        SseEmitter emitter = new SseEmitter(30L * 60L * 1000L);
        emitters.add(emitter);

        emitter.onCompletion(() -> {
            log.debug("SSE emitter completed, removing");
            emitters.remove(emitter);
        });
        emitter.onTimeout(() -> {
            log.debug("SSE emitter timeout, removing");
            emitters.remove(emitter);
            emitter.complete();
        });
        emitter.onError((ex) -> {
            log.debug("SSE emitter error: {}", ex.getMessage());
            emitters.remove(emitter);
        });

        // Gửi ping ngay để client biết kết nối OK
        try {
            emitter.send(SseEmitter.event()
                    .name("connected")
                    .data("{\"message\":\"SSE connected\"}"));
        } catch (IOException e) {
            log.warn("Failed to send initial SSE event", e);
            emitters.remove(emitter);
        }

        log.info("Admin SSE registered. Total subscribers: {}", emitters.size());
        return emitter;
    }

    /**
     * Broadcast event tới tất cả admin đang kết nối.
     * Tự động loại bỏ emitter đã chết (network broken) để tránh memory leak.
     */
    public void broadcast(String eventName, Object data) {
        for (SseEmitter emitter : emitters) {
            try {
                emitter.send(SseEmitter.event()
                        .name(eventName)
                        .data(data));
            } catch (Exception e) {
                log.debug("Failed to send SSE event, removing emitter: {}", e.getMessage());
                emitters.remove(emitter);
                try {
                    emitter.completeWithError(e);
                } catch (Exception ignored) {
                    // ignore
                }
            }
        }
    }
}
