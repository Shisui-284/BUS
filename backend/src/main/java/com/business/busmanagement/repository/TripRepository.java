package com.business.busmanagement.repository;

import com.business.busmanagement.model.Trip;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface TripRepository extends JpaRepository<Trip, Long> {

		@Query("""
				SELECT DISTINCT t FROM Trip t
				LEFT JOIN FETCH t.route
				LEFT JOIN FETCH t.bus
				WHERE (:fromDate IS NULL OR t.departureTime >= :fromDate)
					AND (:toDate IS NULL OR t.departureTime < :toDate)
					AND (:routeId IS NULL OR t.route.id = :routeId)
					AND (:status IS NULL OR t.status = :status)
				ORDER BY t.departureTime ASC
				""")
		List<Trip> searchTrips(
						@Param("fromDate") LocalDateTime fromDate,
						@Param("toDate") LocalDateTime toDate,
						@Param("routeId") Long routeId,
						@Param("status") Trip.TripStatus status
		);

		@Query("""
				SELECT t FROM Trip t
				JOIN t.route r
				WHERE (:origin IS NULL OR LOWER(r.origin) LIKE LOWER(CONCAT('%', :origin, '%')))
					AND (:destination IS NULL OR LOWER(r.destination) LIKE LOWER(CONCAT('%', :destination, '%')))
					AND (:fromDate IS NULL OR t.departureTime >= :fromDate)
					AND (:toDate IS NULL OR t.departureTime < :toDate)
					AND t.status = 'SCHEDULED'
				ORDER BY t.departureTime ASC
				""")
		List<Trip> searchTripsByRoute(
						@Param("origin") String origin,
						@Param("destination") String destination,
						@Param("fromDate") LocalDateTime fromDate,
						@Param("toDate") LocalDateTime toDate
		);

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
