package com.mpbhms.backend.service;

import com.mpbhms.backend.dto.NotificationDTO;
import com.mpbhms.backend.entity.Contract;
import com.mpbhms.backend.entity.RoomUser;
import com.mpbhms.backend.enums.ContractStatus;
import com.mpbhms.backend.repository.ContractRepository;
import jakarta.transaction.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class ContractNotificationScheduler {

    private final ContractRepository contractRepository;
    private final NotificationService notificationService;
    private final Logger logger = LoggerFactory.getLogger(ContractNotificationScheduler.class);

    // Cache để tránh gửi thông báo trùng lặp trong cùng một ngày
    private final Set<Long> notifiedContractsToday = ConcurrentHashMap.newKeySet();

    public ContractNotificationScheduler(ContractRepository contractRepository,
                                         NotificationService notificationService) {
        this.contractRepository = contractRepository;
        this.notificationService = notificationService;
    }

    // chạy mỗi ngày lúc 8h sáng
    @Scheduled(cron = "0 45 22 * * ?")
    @Transactional()
    public void sendUpcomingExpirationNotifications() {
        ZoneId zoneVN = ZoneId.of("Asia/Ho_Chi_Minh");
        LocalDate today = LocalDate.now(zoneVN);
        LocalDate thirtyDaysLater = today.plusDays(30);

        // Xóa cache cũ khi bắt đầu ngày mới
        notifiedContractsToday.clear();
        logger.info("Cleared notification cache for new day");

        // query tất cả hợp đồng còn hiệu lực, hết hạn trong 30 ngày nữa
        List<Contract> expiringContracts = contractRepository
                .findByContractStatusAndContractEndDateBetween(
                        ContractStatus.ACTIVE,
                        today.atStartOfDay(zoneVN).toInstant(),
                        thirtyDaysLater.atTime(LocalTime.MAX).atZone(zoneVN).toInstant(),
                        Pageable.unpaged()
                ).getContent();

        logger.info("Found {} contracts expiring within 30 days", expiringContracts.size());

        for (Contract contract : expiringContracts) {
            // Kiểm tra xem đã gửi thông báo cho contract này trong ngày hôm nay chưa
            if (!notifiedContractsToday.contains(contract.getId())) {
                sendExpirationNotifications(contract);
                // Đánh dấu đã gửi thông báo cho contract này
                notifiedContractsToday.add(contract.getId());
            } else {
                logger.info("Contract {} already notified today, skipping", contract.getId());
            }
        }
    }

    private void sendExpirationNotifications(Contract contract) {
        if (contract.getRoomUsers() == null || contract.getRoom() == null || contract.getContractEndDate() == null) {
            return; // tránh lỗi NPE
        }

        // Tính số ngày còn lại
        long daysUntilExpiry = java.time.Duration.between(
                java.time.Instant.now(),
                contract.getContractEndDate()
        ).toDays();

        // Chỉ gửi thông báo cho hợp đồng còn từ 1-30 ngày và chưa hết hạn
        if (daysUntilExpiry < 1 || daysUntilExpiry > 30) {
            logger.info("Contract {} expires in {} days, skipping notification (only send for 1-30 days)",
                    contract.getId(), daysUntilExpiry);
            return;
        }

        // Kiểm tra hợp đồng chưa hết hạn
        if (contract.getContractEndDate().isBefore(java.time.Instant.now())) {
            logger.info("Contract {} has already expired, skipping notification", contract.getId());
            return;
        }

        String expiryDate = java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy")
                .format(contract.getContractEndDate().atZone(java.time.ZoneId.systemDefault()));

        // 1. Gửi thông báo cho người thuê
        for (RoomUser roomUser : contract.getRoomUsers()) {
            if (roomUser.getIsActive() && roomUser.getUser() != null) {
                NotificationDTO notification = new NotificationDTO();
                notification.setRecipientId(roomUser.getUser().getId());
                notification.setTitle("Hợp đồng sắp hết hạn - Phòng " + contract.getRoom().getRoomNumber());
                notification.setMessage(String.format(
                        "Hợp đồng phòng %s sẽ hết hạn sau %d ngày (ngày %s). Vui lòng liên hệ chủ nhà để gia hạn hợp đồng.",
                        contract.getRoom().getRoomNumber(),
                        daysUntilExpiry,
                        expiryDate
                ));
                notification.setType(com.mpbhms.backend.enums.NotificationType.RENT_REMINDER);
                notification.setMetadata("{\"contractId\":" + contract.getId() + ",\"daysUntilExpiry\":" + daysUntilExpiry + "}");

                try {
                    notificationService.createAndSend(notification);
                    logger.info("Sent notification for contract {} to user {}", contract.getId(), roomUser.getUser().getId());
                } catch (Exception e) {
                    logger.error("Error sending expiration notification: {}", e.getMessage());
                }
            }
        }

        // 2. Gửi thông báo cho chủ nhà
        if (contract.getRoom().getLandlord() != null) {
            NotificationDTO landlordNotification = new NotificationDTO();
            landlordNotification.setRecipientId(contract.getRoom().getLandlord().getId());
            landlordNotification.setTitle("Hợp đồng sắp hết hạn - Phòng " + contract.getRoom().getRoomNumber());
            landlordNotification.setMessage(String.format(
                    "Hợp đồng phòng %s sẽ hết hạn sau %d ngày (ngày %s). Vui lòng liên hệ người thuê để gia hạn hợp đồng.",
                    contract.getRoom().getRoomNumber(),
                    daysUntilExpiry,
                    expiryDate
            ));
            landlordNotification.setType(com.mpbhms.backend.enums.NotificationType.RENT_REMINDER);
            landlordNotification.setMetadata("{\"contractId\":" + contract.getId() + ",\"daysUntilExpiry\":" + daysUntilExpiry + "}");

            try {
                notificationService.createAndSend(landlordNotification);
                logger.info("Sent notification for contract {} to landlord {}", contract.getId(), contract.getRoom().getLandlord().getId());
            } catch (Exception e) {
                logger.error("Error sending expiration notification to landlord: {}", e.getMessage());
            }
        }
    }

    /**
     * Method để test thủ công việc gửi thông báo hợp đồng sắp hết hạn
     */
    @Transactional()
    public void sendUpcomingExpirationNotificationsManual() {
        logger.info("Manual trigger: Starting contract expiration notification check");
        sendUpcomingExpirationNotifications();
    }

    /**
     * Xóa contract khỏi cache khi hợp đồng được gia hạn
     */
    public void removeContractFromCache(Long contractId) {
        notifiedContractsToday.remove(contractId);
        logger.info("Removed contract {} from notification cache (contract renewed)", contractId);
    }
}
