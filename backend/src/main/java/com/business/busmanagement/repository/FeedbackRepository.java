package com.business.busmanagement.repository;

/* ============================================================
 * findAllForAdmin / searchForCustomer / statsForAdmin
 * ============================================================ */

import com.business.busmanagement.model.Feedback;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FeedbackRepository extends JpaRepository<Feedback, Long> {

    @Query("""
            SELECT f FROM Feedback f
            LEFT JOIN FETCH f.user u
            WHERE f.deletedAt IS NULL
              AND (:status IS NULL OR f.status = :status)
              AND (:category IS NULL OR f.category = :category)
              AND (:tripId IS NULL OR f.relatedTripId = :tripId)
              AND (:keyword IS NULL OR :keyword = ''
                   OR LOWER(f.subject) LIKE LOWER(CONCAT('%', :keyword, '%'))
                   OR LOWER(f.content) LIKE LOWER(CONCAT('%', :keyword, '%'))
                   OR LOWER(u.username) LIKE LOWER(CONCAT('%', :keyword, '%')))
            ORDER BY
              CASE f.priority WHEN 'HIGH' THEN 0 WHEN 'MEDIUM' THEN 1 ELSE 2 END,
              f.createdAt DESC
            """)
    List<Feedback> findAllAdmin(
            @Param("status") Feedback.Status status,
            @Param("category") Feedback.Category category,
            @Param("tripId") Long tripId,
            @Param("keyword") String keyword
    );

    @Query("""
            SELECT f FROM Feedback f
            LEFT JOIN FETCH f.user
            WHERE f.user.id = :userId
              AND f.deletedAt IS NULL
            ORDER BY f.createdAt DESC
            """)
    List<Feedback> findAllByUserId(@Param("userId") Long userId);

    @Query("""
            SELECT f FROM Feedback f
            LEFT JOIN FETCH f.user
            LEFT JOIN FETCH f.replies r
            LEFT JOIN FETCH r.author
            WHERE f.id = :id
            """)
    java.util.Optional<Feedback> findByIdWithReplies(@Param("id") Long id);

    long countByStatusAndDeletedAtIsNull(Feedback.Status status);
}