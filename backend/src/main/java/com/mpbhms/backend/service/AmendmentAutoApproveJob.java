package com.mpbhms.backend.service;

import com.mpbhms.backend.entity.ContractAmendment;
import com.mpbhms.backend.repository.ContractAmendmentRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Component
public class AmendmentAutoApproveJob {
    private final ContractAmendmentRepository amendmentRepo;
    private final NotificationService notificationService;

    @Value("${contract.amendment.expire-days:2}")
    private int expireDays;

    public AmendmentAutoApproveJob(ContractAmendmentRepository amendmentRepo, NotificationService notificationService) {
        this.amendmentRepo = amendmentRepo;
        this.notificationService = notificationService;
    }

    // Chạy mỗi ngày lúc 1h sáng
    @Scheduled(cron = "0 0 1 * * ?")
    public void autoApproveExpiredAmendments() {
        Instant now = Instant.now();
        // TODO: Nếu ContractAmendmentRepository chưa có findByStatus thì cần bổ sung
        List<ContractAmendment> pending = amendmentRepo.findByStatus(ContractAmendment.AmendmentStatus.PENDING);
        for (ContractAmendment am : pending) {
            // Sử dụng getCreatedDate() theo chuẩn BaseEntity
            if (am.getCreatedDate() != null) {
                Instant deadline = am.getCreatedDate().plus(expireDays, ChronoUnit.DAYS);
                if (deadline.isBefore(now)) {
                    // Quá hạn, auto-approve
                    if (!Boolean.TRUE.equals(am.getApprovedByTenants())) {
                        am.setApprovedByTenants(true);
                        am.setStatus(ContractAmendment.AmendmentStatus.APPROVED);
                        amendmentRepo.save(am);
                        // Gửi notification cho các bên nếu muốn
                        // TODO: notificationService.createAndSendAutoApproveNotification(am);
                    }
                } else if (deadline.minus(1, ChronoUnit.DAYS).isBefore(now)) {
                    // Còn 1 ngày sẽ hết hạn, gửi notification nhắc nhở
                    // TODO: notificationService.createAndSendReminderNotification(am);
                }
            }
        }
    }
} 