package com.mpbhms.backend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.Instant;

@Entity
@Table(name = "email_sent_logs")
@Getter
@Setter
public class EmailSentLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "bill_id", nullable = false)
    private Bill bill;

    @Column(name = "recipient_email", nullable = false)
    private String recipientEmail;

    @Column(name = "email_type", nullable = false, length = 50)
    private String emailType; // BILL, OVERDUE_WARNING, etc.

    @Column(name = "sent_at", nullable = false)
    private Instant sentAt;

    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    @Column(name = "user_agent", length = 500)
    private String userAgent;

    @Column(name = "sent_by_user_id")
    private Long sentByUserId;

    @PrePersist
    protected void onCreate() {
        if (sentAt == null) {
            sentAt = Instant.now();
        }
    }
}

