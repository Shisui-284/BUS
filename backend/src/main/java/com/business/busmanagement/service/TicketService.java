package com.business.busmanagement.service;

/* ============================================================
 * TICKET SERVICE — Module: Đặt vé / Xử lý vé
 * Chức năng chính:
 *   - bookTicket: validate + tạo vé HOLD (có dùng PESSIMISTIC LOCK chống race)
 *   - Logic check: trip status, thời gian khởi hành, ghế đã đặt
 *   - Gửi notification cho admin khi có vé mới (SSE)
 * ============================================================ */

import com.business.busmanagement.model.*;
import com.business.busmanagement.repository.*;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class TicketService {

    private final TicketRepository ticketRepository;
    private final TripRepository tripRepository;
    private final SeatRepository seatRepository;
    private final PassengerRepository passengerRepository;
    private final UserRepository userRepository;
    private final AdminNotificationService notificationService;

    @Transactional
    public Ticket bookTicket(Long tripId, Long seatId, Long passengerId, Long bookedById, BigDecimal price) {
        Long safeTripId = Objects.requireNonNull(tripId, "tripId is required");
        Long safeSeatId = Objects.requireNonNull(seatId, "seatId is required");

        // Validate giá vé > 0
        if (price == null || price.signum() <= 0) {
            throw new IllegalArgumentException("Ticket price must be greater than 0");
        }

        // Lấy trip + check chuyến còn hoạt động không
        Trip trip = tripRepository.findById(safeTripId)
                .orElseThrow(() -> new IllegalArgumentException("Trip not found"));

        // Chặn đặt vé khi trip đã hủy, hoàn thành, đang chạy hoặc trễ
        if (trip.getStatus() == Trip.TripStatus.CANCELLED
                || trip.getStatus() == Trip.TripStatus.COMPLETED
                || trip.getStatus() == Trip.TripStatus.RUNNING
                || trip.getStatus() == Trip.TripStatus.DELAYED) {
            throw new IllegalStateException("Không thể đặt vé cho chuyến đã hủy, đã hoàn thành, đang chạy hoặc bị trễ");
        }

        // Chặn đặt vé khi còn < 15 phút trước giờ khởi hành
        if (trip.getDepartureTime() == null || LocalDateTime.now().isAfter(trip.getDepartureTime().minusMinutes(15))) {
            throw new IllegalStateException("Không thể đặt vé trong vòng 15 phút trước giờ khởi hành");
        }

        // Lấy seat (có FOR UPDATE lock để tránh 2 user cùng đặt 1 ghế)
        Seat seat = seatRepository.findByIdForUpdate(safeSeatId)
                .orElseThrow(() -> new IllegalArgumentException("Seat not found"));

        // Check ghế có thuộc xe của chuyến này không
        if (!seat.getBus().getId().equals(trip.getBus().getId())) {
            throw new IllegalStateException("Ghế không thuộc xe của chuyến này");
        }

        // Dùng query CÓ LOCK để tránh race condition
        Optional<Ticket> existingTicket = ticketRepository.findByTripIdAndSeatIdForUpdate(safeTripId, safeSeatId);
        Ticket ticket;

        // Nếu ghế đã có vé (HOLD/CANCEL/REFUND) → update, ngược lại tạo mới
        if (existingTicket.isPresent()) {
            ticket = existingTicket.get();
            if (ticket.getStatus() != Ticket.TicketStatus.CANCELLED
                    && ticket.getStatus() != Ticket.TicketStatus.REFUNDED
                    && ticket.getStatus() != Ticket.TicketStatus.HOLD
                    && ticket.getStatus() != Ticket.TicketStatus.CONFIRMED) {
                throw new IllegalStateException("Ghế này đã được đặt cho chuyến này");
            }

            ticket.setPrice(price);
            ticket.setStatus(Ticket.TicketStatus.HOLD);
            ticket.setBookedAt(LocalDateTime.now());
            ticket.setPaidAt(null);
        } else {
            ticket = new Ticket();
            ticket.setTrip(trip);
            ticket.setSeat(seat);
            ticket.setPrice(price);
            ticket.setStatus(Ticket.TicketStatus.HOLD);
            ticket.setBookedAt(LocalDateTime.now());
            ticket.setPaidAt(null);
        }

        if (passengerId != null) {
            Passenger passenger = passengerRepository.findById(passengerId)
                    .orElseThrow(() -> new IllegalArgumentException("Passenger not found"));
            ticket.setPassenger(passenger);
        }

        if (bookedById != null) {
            User user = userRepository.findById(bookedById)
                    .orElseThrow(() -> new IllegalArgumentException("User not found"));
            ticket.setBookedBy(user);
        }

        try {
            Ticket savedTicket = ticketRepository.save(ticket);

            // Đẩy notification tới admin: có vé mới ở trạng thái HOLD
            // cần admin gọi điện xác nhận điểm đón/trả.
            notifyNewBooking(savedTicket);

            return savedTicket;
        } catch (DataIntegrityViolationException ex) {
            throw new IllegalStateException("Ghế đã được đặt bởi người khác. Vui lòng thử ghế khác.", ex);
        }
    }

    /**
     * Publish SSE event "booking.created" cho admin.
     * Payload ngắn gọn để admin hiện toast + click vào mở modal chi tiết.
     */
    private void notifyNewBooking(Ticket ticket) {
        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("ticketId", ticket.getId());
            payload.put("tripId", ticket.getTrip() != null ? ticket.getTrip().getId() : null);
            payload.put("seatNumber", ticket.getSeat() != null ? ticket.getSeat().getSeatNumber() : "");
            payload.put("passengerName", ticket.getPassenger() != null ? ticket.getPassenger().getFullName() : "");
            payload.put("passengerPhone", ticket.getPassenger() != null ? ticket.getPassenger().getPhone() : "");
            payload.put("price", ticket.getPrice());
            payload.put("status", ticket.getStatus().name());
            payload.put("pickupPoint", ticket.getPickupPoint());
            payload.put("dropoffPoint", ticket.getDropoffPoint());
            payload.put("bookedAt", ticket.getBookedAt() != null ? ticket.getBookedAt().toString() : null);

            notificationService.broadcast("booking.created", payload);
        } catch (Exception ex) {
            // Không để lỗi notification làm hỏng flow đặt vé
            org.slf4j.LoggerFactory.getLogger(TicketService.class)
                    .warn("Failed to broadcast booking.created", ex);
        }
    }
}
