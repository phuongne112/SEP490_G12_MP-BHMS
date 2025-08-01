package com.mpbhms.backend.service;

import com.mpbhms.backend.entity.ContractAmendment;
import com.mpbhms.backend.repository.ContractAmendmentRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Component
public class AmendmentAutoApproveJob {
    private static final Logger logger = LoggerFactory.getLogger(AmendmentAutoApproveJob.class);
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
                Instant deadline = am.getCreatedDate().plusSeconds(expireDays * 24 * 60 * 60L);
                logger.info("[AutoApprove] Amendment #{} created at {}, deadline at {}", am.getId(), am.getCreatedDate(), deadline);
                if (deadline.isBefore(now)) {
                    // Quá hạn, auto-approve
                    if (!Boolean.TRUE.equals(am.getApprovedByTenants())) {
                        am.setApprovedByTenants(true);
                        am.setStatus(ContractAmendment.AmendmentStatus.APPROVED);
                        amendmentRepo.save(am);
                        logger.info("[AutoApprove] Amendment #{} auto-approved. Sending notifications...", am.getId());
                        // Gửi notification cho các bên
                        if (am.getContract() != null && am.getContract().getRoomUsers() != null) {
                            for (var ru : am.getContract().getRoomUsers()) {
                                if (ru.getUser() != null) {
                                    try {
                                        logger.info("[AutoApprove] Send notification to user {} for amendment #{}", ru.getUser().getId(), am.getId());
                                        notificationService.createAndSend(new com.mpbhms.backend.dto.NotificationDTO() {{
                                            setRecipientId(ru.getUser().getId());
                                            setTitle("Yêu cầu sửa đổi hợp đồng đã được tự động duyệt");
                                            setMessage("Yêu cầu sửa đổi hợp đồng #" + am.getContract().getId() + " đã được hệ thống tự động duyệt do quá hạn chờ xác nhận.");
                                            setType(com.mpbhms.backend.enums.NotificationType.ANNOUNCEMENT);
                                        }});
                                    } catch (Exception e) {
                                        logger.error("[AutoApprove] Error sending notification to user {}: {}", ru.getUser().getId(), e.getMessage());
                                    }
                                }
                            }
                            // Gửi cho chủ nhà nếu có
                            if (am.getContract().getRoom() != null && am.getContract().getRoom().getLandlord() != null) {
                                try {
                                    logger.info("[AutoApprove] Send notification to landlord {} for amendment #{}", am.getContract().getRoom().getLandlord().getId(), am.getId());
                                    notificationService.createAndSend(new com.mpbhms.backend.dto.NotificationDTO() {{
                                        setRecipientId(am.getContract().getRoom().getLandlord().getId());
                                        setTitle("Yêu cầu sửa đổi hợp đồng đã được tự động duyệt");
                                        setMessage("Yêu cầu sửa đổi hợp đồng #" + am.getContract().getId() + " đã được hệ thống tự động duyệt do quá hạn chờ xác nhận.");
                                        setType(com.mpbhms.backend.enums.NotificationType.ANNOUNCEMENT);
                                    }});
                                } catch (Exception e) {
                                    logger.error("[AutoApprove] Error sending notification to landlord {}: {}", am.getContract().getRoom().getLandlord().getId(), e.getMessage());
                                }
                            }
                        }
                    }
                } else if (deadline.minusSeconds(24 * 60 * 60L).isBefore(now)) {
                    // Còn 1 ngày sẽ hết hạn, gửi notification nhắc nhở
                    // TODO: notificationService.createAndSendReminderNotification(am);
                }
            }
        }
    }
} 