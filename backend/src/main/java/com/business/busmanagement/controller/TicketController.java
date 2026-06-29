package com.business.busmanagement.controller;

/* ============================================================================
 * TICKET CONTROLLER  — Module: Đặt vé / Thanh toán / Lịch sử vé
 * Chức năng chính:
 *   - PUBLIC:   /api/public/trips          → lấy DS chuyến tương lai
 *   - PUBLIC:   /api/public/trips/search   → tìm chuyến theo tuyến + ngày
 *   - PUBLIC:   /api/public/trips/{id}/seats → sơ đồ ghế (auto-generate nếu thiếu)
 *   - PRIVATE:  /api/private/tickets       → đặt vé (HOLD)
 *   - PRIVATE:  /api/private/tickets/my    → lịch sử vé của tôi
 *   - PRIVATE:  /api/private/tickets/{id}/cancel → hủy vé
 *   - PRIVATE:  /api/private/tickets/{id}/pay    → thanh toán online
 * ============================================================================ */

import com.business.busmanagement.dto.*;
import com.business.busmanagement.exception.ResourceNotFoundException;
import com.business.busmanagement.model.*;
import com.business.busmanagement.repository.*;
import com.business.busmanagement.service.TicketService;
import com.business.busmanagement.service.TripService;
import com.business.busmanagement.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@CrossOrigin(origins = "${app.cors.allowed-origins}")
public class TicketController {

    private final TripRepository tripRepository;
    private final SeatRepository seatRepository;
    private final TicketRepository ticketRepository;
    private final PassengerRepository passengerRepository;
    private final BusRepository busRepository;
    private final TripService tripService;
    private final UserService userService;
    private final TicketService ticketService;
    private final PaymentRepository paymentRepository;

    // ----------------------------------------------------------------
    // PUBLIC — Tất cả chuyến tương lai
    // GET /api/public/trips
    // Mục đích: Customer xem DS chuyến sắp chạy để chọn đặt vé
    // ----------------------------------------------------------------
    @GetMapping("/public/trips")
    public ResponseEntity<List<TripSearchResponse>> getAllUpcomingTrips(
            @RequestParam(required = false) String date) {
        LocalDate localDate = (date != null && !date.isBlank())
                ? LocalDate.parse(date)
                : LocalDate.now();
        List<TripSearchResponse> result = tripService.getUpcomingTrips(localDate);
        return ResponseEntity.ok(result);
    }

    // ----------------------------------------------------------------
    // PUBLIC — Tìm chuyến theo origin/destination/date
    // GET /api/public/trips/search?origin=Hà Nội&destination=TP.HCM&date=2026-05-30
    // Mục đích: Tìm chuyến theo điểm đi, điểm đến, ngày đi (cho form search)
    // ----------------------------------------------------------------
    @GetMapping("/public/trips/search")
    public ResponseEntity<List<TripSearchResponse>> searchTrips(
            @RequestParam(required = false) String origin,
            @RequestParam(required = false) String destination,
            @RequestParam(required = false) String date) {
        LocalDate localDate = (date != null && !date.isBlank())
                ? LocalDate.parse(date)
                : LocalDate.now();
        String trimmedOrigin = (origin != null) ? origin.trim() : null;
        String trimmedDestination = (destination != null) ? destination.trim() : null;
        List<TripSearchResponse> result = tripService.searchTripsByRoute(trimmedOrigin, trimmedDestination, localDate);
        return ResponseEntity.ok(result);
    }

    // ----------------------------------------------------------------
    // PUBLIC — Sơ đồ ghế của 1 chuyến
    // GET /api/public/trips/{tripId}/seats
    // Auto-tạo ghế nếu bus chưa có ghế trong DB (dựa trên bus.totalSeats)
    // ----------------------------------------------------------------
    @GetMapping("/public/trips/{tripId}/seats")
    @Transactional
    public ResponseEntity<List<SeatStatusResponse>> getTripSeats(@PathVariable Long tripId) {
        // Dùng findByIdWithBusAndRoute để EAGER LOAD bus
        Trip trip = tripRepository.findByIdWithBusAndRoute(tripId)
                .orElseThrow(() -> new ResourceNotFoundException("Trip not found"));

        if (trip.getBus() == null) {
            throw new IllegalStateException("Chuyến này chưa được gán xe");
        }

        Long busId = trip.getBus().getId();
        Integer totalBusSeats = trip.getBus().getTotalSeats();

        if (totalBusSeats == null || totalBusSeats <= 0) {
            throw new IllegalStateException("Xe không có số ghế hợp lệ");
        }

        // Tự động tạo ghế nếu bus chưa có ghế trong DB
        ensureSeatsExist(busId, totalBusSeats);

        List<Long> bookedIds = ticketRepository.findBookedSeatIdsByTripId(tripId);

        List<SeatStatusResponse> seats = seatRepository.findByBusId(busId).stream()
                .map(seat -> new SeatStatusResponse(
                        seat.getId(),
                        seat.getSeatNumber(),
                        seat.getPositionX(),
                        seat.getPositionY(),
                        bookedIds.contains(seat.getId())
                ))
                .sorted((a, b) -> {
                    int numA = extractSeatNumber(a.getSeatNumber());
                    int numB = extractSeatNumber(b.getSeatNumber());
                    return Integer.compare(numA, numB);
                })
                .toList();

        return ResponseEntity.ok(seats);
    }

    /**
     * Auto-generate seats cho 1 bus nếu chưa tồn tại trong DB.
     * Tạo layout grid chuẩn: 10 ghế/hàng, mỗi hàng có 5 ghế trái + 5 ghế phải.
     * Ghế được đánh số 1, 2, 3... theo thứ tự.
     */
    private void ensureSeatsExist(Long busId, int totalSeats) {
        List<Seat> existingSeats = seatRepository.findByBusId(busId);
        if (!existingSeats.isEmpty()) return; // Đã có ghế rồi

        Bus bus = busRepository.findById(busId)
                .orElseThrow(() -> new IllegalStateException("Bus not found: " + busId));

        int seatsPerRow = 10; // 5 trái + 5 phải

        for (int i = 0; i < totalSeats; i++) {
            int row = i / seatsPerRow;
            int posInRow = i % seatsPerRow;

            // Bên trái cửa (vị trí 0-4): x thấp | Bên phải cửa (vị trí 5-9): x cao hơn
            int x = (posInRow < seatsPerRow / 2)
                    ? 10 + posInRow * 20
                    : 120 + (posInRow - seatsPerRow / 2) * 20;
            int y = 10 + row * 35;

            Seat seat = new Seat();
            seat.setBus(bus);
            seat.setSeatNumber(String.valueOf(i + 1));
            seat.setPositionX(x);
            seat.setPositionY(y);

            seatRepository.save(seat);
        }
    }

    /** Trích số từ seatNumber để sort đúng thứ tự. VD: "1" → 1, "10" → 10 */
    private int extractSeatNumber(String seatNumber) {
        if (seatNumber == null) return 0;
        String num = seatNumber.replaceAll("[^0-9]", "");
        try {
            return num.isEmpty() ? 0 : Integer.parseInt(num);
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    // ----------------------------------------------------------------
    // PRIVATE — Đặt vé (cần đăng nhập, chỉ CUSTOMER)
    // POST /api/private/tickets
    // Body: { tripId, seatId, price, passengerPhone }
    // Luồng:
    //   1. Lấy user đang đăng nhập từ SecurityContext (JWT)
    //   2. Auto-tạo Passenger nếu user lần đầu đặt vé
    //   3. Cập nhật SĐT passenger từ form
    //   4. Gọi TicketService.bookTicket() → tạo vé ở trạng thái HOLD
    //   5. Lưu điểm đón / điểm trả cụ thể (pickupPoint, dropoffPoint)
    // ----------------------------------------------------------------
    @PostMapping("/private/tickets")
    public ResponseEntity<TicketResponse> bookTicket(@Valid @RequestBody BookTicketRequest request) {
        User currentUser = getCurrentUser(); // Lấy user từ JWT token

        // Tự động tạo Passenger nếu chưa tồn tại
        Passenger passenger = passengerRepository.findByUserId(currentUser.getId())
                .orElseGet(() -> {
                    Passenger newPassenger = new Passenger();
                    newPassenger.setUser(currentUser);
                    newPassenger.setFullName(currentUser.getUsername());
                    newPassenger.setEmail(currentUser.getEmail());
                    newPassenger.setPhone("");
                    return passengerRepository.save(newPassenger);
                });

        // Cập nhật SĐT từ form đặt vé vào Passenger
        passenger.setPhone(request.getPassengerPhone());
        passengerRepository.save(passenger);

        Ticket ticket = ticketService.bookTicket(
                request.getTripId(),
                request.getSeatId(),
                passenger.getId(),
                currentUser.getId(),
                request.getPrice()
        );

        // Lưu điểm đón / điểm trả cụ thể
        ticket.setPickupPoint(request.getPickupPoint());
        ticket.setDropoffPoint(request.getDropoffPoint());
        ticketRepository.save(ticket);

        return ResponseEntity.ok(toTicketResponse(ticket));
    }

    // ----------------------------------------------------------------
    // PRIVATE — Lịch sử vé của tôi
    // GET /api/private/tickets/my
    // Trả về DS vé của customer đang đăng nhập, có try-catch để tránh crash nếu data lỗi
    // ----------------------------------------------------------------
    @GetMapping("/private/tickets/my")
    public ResponseEntity<List<TicketResponse>> getMyTickets() {
        User currentUser = getCurrentUser();
        // Lấy tất cả vé của passenger thuộc user hiện tại
        List<Ticket> tickets = ticketRepository.findByPassengerUserId(currentUser.getId());
        return ResponseEntity.ok(tickets.stream()
                .map(t -> {
                    try { return toTicketResponse(t); }
                    catch (Exception ex) {
                        return buildFallbackResponse(t);
                    }
                })
                .toList());
    }

    // ----------------------------------------------------------------
    // PRIVATE — Hủy vé
    // PUT /api/private/tickets/{id}/cancel
    // Validate:
    //   - Vé phải thuộc user đang đăng nhập
    //   - Vé phải ở trạng thái HOLD hoặc BOOKED (không hủy vé đã PAID/CONFIRMED)
    //   - Chuyến chưa khởi hành
    // ----------------------------------------------------------------
    @PutMapping("/private/tickets/{id}/cancel")
    public ResponseEntity<TicketResponse> cancelTicket(@PathVariable Long id) {
        User currentUser = getCurrentUser();

        Ticket ticket = ticketRepository.findByIdWithDetails(id)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket not found"));

        // Chỉ cho hủy vé của chính mình
        if (ticket.getPassenger() == null
                || !ticket.getPassenger().getUser().getId().equals(currentUser.getId())) {
            throw new SecurityException("Bạn không có quyền hủy vé này");
        }

        // Chỉ cho phép hủy vé đang ở trạng thái HOLD hoặc BOOKED
        if (ticket.getStatus() == Ticket.TicketStatus.CANCELLED) {
            throw new IllegalStateException("Vé đã bị hủy trước đó");
        }

        if (ticket.getStatus() == Ticket.TicketStatus.CONFIRMED
                || ticket.getStatus() == Ticket.TicketStatus.PAID) {
            throw new IllegalStateException("Không thể hủy vé đã được xác nhận hoặc thanh toán. Vui lòng liên hệ bộ phận hỗ trợ.");
        }

        if (ticket.getStatus() == Ticket.TicketStatus.REFUNDED) {
            throw new IllegalStateException("Vé đã được hoàn tiền trước đó");
        }

        // Không cho hủy vé nếu chuyến đã khởi hành
        if (ticket.getTrip() != null && ticket.getTrip().getDepartureTime() != null
                && LocalDateTime.now().isAfter(ticket.getTrip().getDepartureTime())) {
            throw new IllegalStateException("Không thể hủy vé vì chuyến xe đã khởi hành");
        }

        ticket.setStatus(Ticket.TicketStatus.CANCELLED);
        ticketRepository.save(ticket);

        return ResponseEntity.ok(toTicketResponse(ticket));
    }

    // ----------------------------------------------------------------
    // PRIVATE — Thanh toán vé trực tuyến (không qua VNPay)
    // PUT /api/private/tickets/{id}/pay
    // Body: { paymentMethod: "CARD" | "MOMO" | "BANK" | "CASH" }
    // Dùng cho thanh toán nhanh tại quầy, không qua cổng VNPay
    // ----------------------------------------------------------------
    @PutMapping("/private/tickets/{id}/pay")
    public ResponseEntity<TicketResponse> payTicket(@PathVariable Long id, @RequestBody PayTicketRequest request) {
        User currentUser = getCurrentUser();

        Ticket ticket = ticketRepository.findByIdWithDetails(id)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket not found"));

        // Chỉ chủ vé mới được thanh toán
        if (ticket.getPassenger() == null
                || !ticket.getPassenger().getUser().getId().equals(currentUser.getId())) {
            throw new SecurityException("Bạn không có quyền thanh toán vé này");
        }

        // Chỉ vé HOLD mới có thể thanh toán online
        if (ticket.getStatus() != Ticket.TicketStatus.HOLD) {
            throw new IllegalStateException("Chỉ vé đang chờ thanh toán (HOLD) mới có thể thanh toán");
        }

        // Kiểm tra chuyến chưa khởi hành
        if (ticket.getTrip() != null && ticket.getTrip().getDepartureTime() != null
                && LocalDateTime.now().isAfter(ticket.getTrip().getDepartureTime())) {
            throw new IllegalStateException("Không thể thanh toán vé của chuyến đã khởi hành");
        }

        // Tạo payment record
        Payment payment = new Payment();
        payment.setTicket(ticket);
        payment.setAmount(ticket.getPrice());
        payment.setPaymentMethod(request.getPaymentMethod());
        payment.setStatus(Payment.PaymentStatus.SUCCESS);
        payment.setTransactionCode(request.getPaymentMethod().name() + "-" + System.currentTimeMillis());
        payment.setPaidAt(LocalDateTime.now());
        paymentRepository.save(payment);

        // Cập nhật trạng thái vé
        ticket.setPayment(payment);
        ticket.setStatus(Ticket.TicketStatus.PAID);
        ticket.setPaidAt(LocalDateTime.now());
        ticketRepository.save(ticket);

        return ResponseEntity.ok(toTicketResponse(ticket));
    }

    // ---- Helpers ----

    private User getCurrentUser() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return userService.findByUsername(username)
                .orElseThrow(() -> new SecurityException("User not found"));
    }

    private TicketResponse toTicketResponse(Ticket ticket) {
        Trip trip = ticket.getTrip();
        String origin = "", destination = "";
        LocalDateTime depTime = null, arrTime = null;
        String licensePlate = "", busType = "", busLabel = "";
        if (trip != null) {
            Route route = trip.getRoute();
            if (route != null) {
                origin = route.getOrigin() != null ? route.getOrigin() : "";
                destination = route.getDestination() != null ? route.getDestination() : "";
            }
            depTime = trip.getDepartureTime();
            arrTime = trip.getArrivalTime();
            // Bus đã được eager-load trong findByPassengerUserId, dùng trực tiếp
            if (trip.getBus() != null) {
                Bus bus = trip.getBus();
                licensePlate = bus.getLicensePlate() != null ? bus.getLicensePlate() : "";
                busType = bus.getBusType() != null ? bus.getBusType().name() : "";
                busLabel = licensePlate + (busType.isEmpty() ? "" : " - " + busType);
            }
        }

        Payment payment = ticket.getPayment();
        Long pId = null;
        String pMethod = null, pStatus = null, txCode = null;
        LocalDateTime txTime = null;
        if (payment != null) {
            pId = payment.getId();
            pMethod = payment.getPaymentMethod() != null ? payment.getPaymentMethod().name() : null;
            pStatus = payment.getStatus() != null ? payment.getStatus().name() : null;
            txCode = payment.getTransactionCode();
            txTime = payment.getPaidAt();
        }

        String ticketCode = generateTicketCode(ticket);
        String passEmail = (ticket.getPassenger() != null && ticket.getPassenger().getEmail() != null)
                ? ticket.getPassenger().getEmail() : "";

        return new TicketResponse(
                ticket.getId(),
                trip != null ? trip.getId() : null,
                origin,
                destination,
                depTime,
                arrTime,
                licensePlate,
                busType,
                busLabel,
                ticket.getSeat() != null ? ticket.getSeat().getSeatNumber() : "",
                ticket.getPassenger() != null ? ticket.getPassenger().getFullName() : "",
                ticket.getPassenger() != null ? ticket.getPassenger().getPhone() : "",
                passEmail,
                ticket.getPrice(),
                ticket.getStatus().name(),
                ticket.getBookedAt(),
                ticket.getPaidAt(),
                pId,
                pMethod,
                pStatus,
                txCode,
                txTime,
                ticketCode,
                ticket.getPickupPoint(),
                ticket.getDropoffPoint()
        );
    }

    private TicketResponse buildFallbackResponse(Ticket ticket) {
        return new TicketResponse(
                ticket.getId(),
                ticket.getTrip() != null ? ticket.getTrip().getId() : null,
                "", "",
                ticket.getTrip() != null ? ticket.getTrip().getDepartureTime() : null,
                ticket.getTrip() != null ? ticket.getTrip().getArrivalTime() : null,
                "", "", "",
                "",   // seatNumber - might be orphaned, skip to avoid lazy-load crash
                ticket.getPassenger() != null ? ticket.getPassenger().getFullName() : "—",
                ticket.getPassenger() != null ? ticket.getPassenger().getPhone() : "—",
                "",
                ticket.getPrice(),
                ticket.getStatus().name(),
                ticket.getBookedAt(),
                ticket.getPaidAt(),
                null, null, null, null, null,
                generateTicketCode(ticket),
                ticket.getPickupPoint(),
                ticket.getDropoffPoint()
        );
    }

    private String generateTicketCode(Ticket ticket) {
        String date = ticket.getBookedAt() != null
                ? ticket.getBookedAt().toLocalDate().toString().replace("-", "")
                : java.time.LocalDate.now().toString().replace("-", "");
        return String.format("BUS-%s-%05d", date, ticket.getId());
    }
}
