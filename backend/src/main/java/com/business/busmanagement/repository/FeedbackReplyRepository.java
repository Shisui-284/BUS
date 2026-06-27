package com.business.busmanagement.repository;

import com.business.busmanagement.model.FeedbackReply;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FeedbackReplyRepository extends JpaRepository<FeedbackReply, Long> {

    @Query("""
            SELECT r FROM FeedbackReply r
            LEFT JOIN FETCH r.author
            WHERE r.feedback.id = :feedbackId
            ORDER BY r.createdAt ASC
            """)
    List<FeedbackReply> findAllByFeedbackId(@Param("feedbackId") Long feedbackId);
}