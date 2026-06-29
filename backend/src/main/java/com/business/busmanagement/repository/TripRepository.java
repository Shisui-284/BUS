package com.business.busmanagement.repository;

/* ============================================================
 * Query đặc biệt:
 *   - findUpcomingTrips: chuyến SCHEDULED trong tương lai
 *   - searchByRoute: tìm theo origin/destination/date
 *   - findByIdWithBusAndRoute: EAGER LOAD (tránh N+1)
 * ============================================================ */

import com.business.busmanagement.model.Trip;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface TripRepository extends JpaRepository<Trip, Long> {

    // Lấy tất cả chuyến tương lai - an toàn, không dùng enum parameter
    // Chỉ lấy SCHEDULED để customer thấy được chuyến admin tạo
    @Query("""
            SELECT DISTINCT t FROM Trip t
            LEFT JOIN FETCH t.route
            LEFT JOIN FETCH t.bus
            WHERE t.departureTime >= :fromDate
                AND t.departureTime < :toDate
                AND t.status = 'SCHEDULED'
            ORDER BY t.departureTime ASC
            """)
    List<Trip> findUpcomingTrips(
            @Param("fromDate") LocalDateTime fromDate,
            @Param("toDate") LocalDateTime toDate
    );

    // Tìm theo origin/destination - an toàn với SCHEDULED string
    // Thêm null-safe: route phải tồn tại và có origin/destination không null
    @Query("""
            SELECT DISTINCT t FROM Trip t
            LEFT JOIN FETCH t.route r
            LEFT JOIN FETCH t.bus
            WHERE t.departureTime >= :fromDate
                AND t.departureTime < :toDate
                AND t.status = 'SCHEDULED'
                AND r.origin IS NOT NULL
                AND r.destination IS NOT NULL
                AND (
                    LOWER(r.origin) = LOWER(:origin)
                        AND LOWER(r.destination) = LOWER(:destination)
                    OR
                    LOWER(r.origin) = LOWER(:destination)
                        AND LOWER(r.destination) = LOWER(:origin)
                )
            ORDER BY t.departureTime ASC
            """)
    List<Trip> searchTripsByRoute(
            @Param("origin") String origin,
            @Param("destination") String destination,
            @Param("fromDate") LocalDateTime fromDate,
            @Param("toDate") LocalDateTime toDate
    );

    // Lấy chuyến theo ngày - an toàn, null-safe
    @Query("""
            SELECT DISTINCT t FROM Trip t
            LEFT JOIN FETCH t.route r
            LEFT JOIN FETCH t.bus
            WHERE t.departureTime >= :fromDate
                AND t.departureTime < :toDate
                AND t.status = 'SCHEDULED'
                AND r.origin IS NOT NULL
                AND r.destination IS NOT NULL
            ORDER BY t.departureTime ASC
            """)
    List<Trip> findScheduledTrips(
            @Param("fromDate") LocalDateTime fromDate,
            @Param("toDate") LocalDateTime toDate
    );

    // Admin: tìm với nhiều filter - dùng enum parameter, null-safe route
    @Query("""
            SELECT DISTINCT t FROM Trip t
            LEFT JOIN FETCH t.route
            LEFT JOIN FETCH t.bus
            WHERE (:fromDate IS NULL OR t.departureTime >= :fromDate)
                AND (:toDate IS NULL OR t.departureTime < :toDate)
                AND (:routeId IS NULL OR (t.route IS NOT NULL AND t.route.id = :routeId))
                AND (:status IS NULL OR t.status = :status)
            ORDER BY t.departureTime ASC
            """)
    List<Trip> searchTrips(
            @Param("fromDate") LocalDateTime fromDate,
            @Param("toDate") LocalDateTime toDate,
            @Param("routeId") Long routeId,
            @Param("status") Trip.TripStatus status
    );

    @Query("SELECT t FROM Trip t LEFT JOIN FETCH t.bus LEFT JOIN FETCH t.route WHERE t.id = :id")
    Optional<Trip> findByIdWithBusAndRoute(@Param("id") Long id);

    @Query("""
            SELECT COUNT(t) > 0 FROM Trip t
            WHERE t.bus.id = :busId
                AND t.departureTime < :arrivalTime
                AND t.arrivalTime > :departureTime
                AND (:excludeTripId IS NULL OR t.id <> :excludeTripId)
            """)
    boolean existsConflictingTripForBus(
            @Param("busId") Long busId,
            @Param("departureTime") LocalDateTime departureTime,
            @Param("arrivalTime") LocalDateTime arrivalTime,
            @Param("excludeTripId") Long excludeTripId
    );
}
