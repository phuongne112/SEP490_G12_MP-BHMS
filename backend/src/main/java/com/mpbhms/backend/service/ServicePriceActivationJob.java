package com.mpbhms.backend.service;

import com.mpbhms.backend.entity.CustomService;
import com.mpbhms.backend.entity.ServicePriceHistory;
import com.mpbhms.backend.repository.ServicePriceHistoryRepository;
import com.mpbhms.backend.repository.ServiceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class ServicePriceActivationJob {

    private final ServicePriceHistoryRepository servicePriceHistoryRepository;
    private final ServiceRepository serviceRepository;

    /**
     * Job chạy hàng ngày lúc 00:01 để kích hoạt giá dịch vụ mới
     * Khi đến ngày hiệu lực, giá mới sẽ được áp dụng và giá cũ sẽ bị vô hiệu hóa
     */
    @Scheduled(cron = "0 1 0 * * ?") // Chạy lúc 00:01 hàng ngày
    @Transactional
    public void activateServicePrices() {
        log.info("Bắt đầu job kích hoạt giá dịch vụ mới...");
        
        LocalDate today = LocalDate.now();
        
        // Tìm tất cả lịch sử giá có ngày hiệu lực là hôm nay và chưa active
        List<ServicePriceHistory> pendingPrices = servicePriceHistoryRepository
                .findByEffectiveDateAndIsActiveFalse(today);
        
        log.info("Tìm thấy {} giá dịch vụ cần kích hoạt", pendingPrices.size());
        
        for (ServicePriceHistory priceHistory : pendingPrices) {
            try {
                activateServicePrice(priceHistory);
                log.info("Đã kích hoạt giá mới cho dịch vụ: {}", priceHistory.getService().getServiceName());
            } catch (Exception e) {
                log.error("Lỗi khi kích hoạt giá cho dịch vụ {}: {}", 
                    priceHistory.getService().getServiceName(), e.getMessage());
            }
        }
        
        log.info("Hoàn thành job kích hoạt giá dịch vụ mới");
    }
    
    /**
     * Kích hoạt giá dịch vụ mới
     */
    private void activateServicePrice(ServicePriceHistory newPrice) {
        CustomService service = newPrice.getService();
        
        // 1. Vô hiệu hóa giá cũ đang active
        List<ServicePriceHistory> activePrices = servicePriceHistoryRepository
                .findByServiceIdAndIsActiveTrue(service.getId());
        
        for (ServicePriceHistory activePrice : activePrices) {
            activePrice.setIsActive(false);
            activePrice.setEndDate(newPrice.getEffectiveDate().minusDays(1));
            servicePriceHistoryRepository.save(activePrice);
        }
        
        // 2. Kích hoạt giá mới
        newPrice.setIsActive(true);
        servicePriceHistoryRepository.save(newPrice);
        
        // 3. Cập nhật giá hiện tại của service
        service.setUnitPrice(newPrice.getUnitPrice());
        serviceRepository.save(service);
    }
} 