package com.mpbhms.backend.repository;

import com.mpbhms.backend.entity.EmailSentLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

@Repository
public interface EmailSentLogRepository extends JpaRepository<EmailSentLog, Long> {
    
    /**
     * Kiểm tra xem email đã được gửi trong khoảng thời gian nhất định chưa
     */
    @Query("SELECT COUNT(e) FROM EmailSentLog e WHERE e.bill.id = :billId AND e.emailType = :emailType AND e.sentAt >= :since")
    long countEmailsSentSince(@Param("billId") Long billId, @Param("emailType") String emailType, @Param("since") Instant since);

    /**
     * Lấy danh sách email đã gửi cho một hóa đơn
     */
    @Query("SELECT e FROM EmailSentLog e WHERE e.bill.id = :billId ORDER BY e.sentAt DESC")
    List<EmailSentLog> findByBillIdOrderBySentAtDesc(@Param("billId") Long billId);

    /**
     * Kiểm tra email từ cùng IP address trong thời gian ngắn
     */
    @Query("SELECT COUNT(e) FROM EmailSentLog e WHERE e.bill.id = :billId AND e.ipAddress = :ipAddress AND e.sentAt >= :since")
    long countEmailsFromIpSince(@Param("billId") Long billId, @Param("ipAddress") String ipAddress, @Param("since") Instant since);

    /**
     * Lấy email gần nhất đã gửi cho một hóa đơn
     */
    @Query("SELECT e FROM EmailSentLog e WHERE e.bill.id = :billId AND e.emailType = :emailType ORDER BY e.sentAt DESC LIMIT 1")
    EmailSentLog findLastEmailSent(@Param("billId") Long billId, @Param("emailType") String emailType);
}

