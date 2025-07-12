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
                        // Gửi notification cho các bên
                        if (am.getContract() != null && am.getContract().getRoomUsers() != null) {
                            for (var ru : am.getContract().getRoomUsers()) {
                                if (ru.getUser() != null) {
                                    notificationService.createAndSend(new com.mpbhms.backend.dto.NotificationDTO() {{
                                        setRecipientId(ru.getUser().getId());
                                        setTitle("Yêu cầu sửa đổi hợp đồng đã được tự động duyệt");
                                        setMessage("Yêu cầu sửa đổi hợp đồng #" + am.getContract().getId() + " đã được hệ thống tự động duyệt do quá hạn chờ xác nhận.");
                                        setType(com.mpbhms.backend.enums.NotificationType.CUSTOM);
                                    }});
                                }
                            }
                            // Gửi cho chủ nhà nếu có
                            if (am.getContract().getRoom() != null && am.getContract().getRoom().getLandlord() != null) {
                                notificationService.createAndSend(new com.mpbhms.backend.dto.NotificationDTO() {{
                                    setRecipientId(am.getContract().getRoom().getLandlord().getId());
                                    setTitle("Yêu cầu sửa đổi hợp đồng đã được tự động duyệt");
                                    setMessage("Yêu cầu sửa đổi hợp đồng #" + am.getContract().getId() + " đã được hệ thống tự động duyệt do quá hạn chờ xác nhận.");
                                    setType(com.mpbhms.backend.enums.NotificationType.CUSTOM);
                                }});
                            }
                        }
                    }
                } else if (deadline.minus(1, ChronoUnit.DAYS).isBefore(now)) {
                    // Còn 1 ngày sẽ hết hạn, gửi notification nhắc nhở
                    // TODO: notificationService.createAndSendReminderNotification(am);
                }
            }
        }
    }
} 