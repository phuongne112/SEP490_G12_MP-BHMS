package com.mpbhms.backend.service;

import com.mpbhms.backend.dto.BillResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import com.mpbhms.backend.entity.Bill;

@Service
@RequiredArgsConstructor
@Slf4j
public class LatePenaltySchedulerService {

    private final BillService billService;

    /**
     * Chạy tự động mỗi phút để kiểm tra và tạo phạt quá hạn
     * Chạy mỗi phút để đảm bảo phát hiện và xử lý kịp thời
     */
    @Scheduled(cron = "0 * * * * ?") // Mỗi phút
    @Transactional
    public void checkAndCreateLatePenaltiesScheduled() {
        log.info("🔄 Bắt đầu kiểm tra và tạo phạt quá hạn tự động...");
        System.out.println("🔄 [" + java.time.LocalDateTime.now() + "] Bắt đầu job kiểm tra và tạo phạt quá hạn tự động...");
        
        try {
            // 🆕 LOGIC MỚI: Tách biệt cảnh báo và tạo phạt
            // 1. Gửi cảnh báo cho hóa đơn quá hạn 7 ngày
            billService.sendOverdueWarningFor7Days();
            
            // 2. Tạo phạt cho hóa đơn quá hạn từ 8 ngày trở đi
            List<BillResponse> createdPenalties = billService.checkAndCreateLatePenalties();
            
            if (!createdPenalties.isEmpty()) {
                log.info("✅ Đã tạo {} hóa đơn phạt tự động", createdPenalties.size());
                System.out.println("✅ [" + java.time.LocalDateTime.now() + "] Đã tạo " + createdPenalties.size() + " hóa đơn phạt tự động");
                for (BillResponse penalty : createdPenalties) {
                    log.info("📄 Hóa đơn phạt #{} cho hóa đơn gốc #{} - Số tiền: {} VNĐ", 
                        penalty.getId(), penalty.getOriginalBillId(), penalty.getTotalAmount());
                    System.out.println("📄 [" + java.time.LocalDateTime.now() + "] Hóa đơn phạt #" + penalty.getId() + 
                        " cho hóa đơn gốc #" + penalty.getOriginalBillId() + " - Số tiền: " + penalty.getTotalAmount() + " VNĐ");
                }
            } else {
                log.debug("ℹ️ Không có hóa đơn nào cần tạo phạt");
                System.out.println("ℹ️ [" + java.time.LocalDateTime.now() + "] Không có hóa đơn nào cần tạo phạt");
            }
        } catch (Exception e) {
            log.error("❌ Lỗi khi kiểm tra và tạo phạt quá hạn tự động", e);
            System.err.println("❌ [" + java.time.LocalDateTime.now() + "] Lỗi khi kiểm tra và tạo phạt quá hạn tự động: " + e.getMessage());
            e.printStackTrace();
        }
    }

    /**
     * Chạy tự động mỗi phút để cập nhật phạt tăng dần
     * Chỉ cập nhật khi cần thiết (tỷ lệ phạt thay đổi)
     */
    @Scheduled(cron = "0 * * * * ?") // Mỗi phút
    @Transactional
    public void updateExistingPenaltiesScheduled() {
        log.info("🔄 Bắt đầu cập nhật phạt tăng dần tự động...");
        System.out.println("🔄 [" + java.time.LocalDateTime.now() + "] Bắt đầu job cập nhật phạt tăng dần tự động...");
        
        try {
            // Lấy tất cả hóa đơn phạt hiện tại
            List<Bill> existingPenalties = billService.getAllPenaltyBills();
            
            System.out.println("🔍 [" + java.time.LocalDateTime.now() + "] Tìm thấy " + existingPenalties.size() + " hóa đơn phạt cần kiểm tra");
            
            int updatedCount = 0;
            for (Bill penaltyBill : existingPenalties) {
                try {
                    Bill originalBill = penaltyBill.getOriginalBill();
                    if (originalBill == null) {
                        System.out.println("⚠️ [" + java.time.LocalDateTime.now() + "] Hóa đơn phạt #" + penaltyBill.getId() + " không có hóa đơn gốc, bỏ qua");
                        continue;
                    }
                    
                    // Kiểm tra xem hóa đơn gốc có còn quá hạn không
                    if (originalBill.getStatus()) {
                        System.out.println("ℹ️ [" + java.time.LocalDateTime.now() + "] Hóa đơn gốc #" + originalBill.getId() + " đã thanh toán, bỏ qua phạt #" + penaltyBill.getId());
                        continue;
                    }
                    
                    // Tính số ngày quá hạn hiện tại
                    int currentOverdueDays = billService.calculateOverdueDays(originalBill);
                    int penaltyOverdueDays = penaltyBill.getOverdueDays() != null ? penaltyBill.getOverdueDays() : 0;
                    
                    System.out.println("🔍 [" + java.time.LocalDateTime.now() + "] So sánh phạt #" + penaltyBill.getId() + 
                        " - Hóa đơn gốc #" + originalBill.getId() + 
                        " - Current overdue: " + currentOverdueDays + " ngày" +
                        " - Penalty overdue: " + penaltyOverdueDays + " ngày");
                    
                    // Kiểm tra xem có cần cập nhật không
                    // Cập nhật khi: currentOverdueDays khác penaltyOverdueDays (có thể lớn hơn hoặc nhỏ hơn)
                    if (currentOverdueDays != penaltyOverdueDays) {
                        System.out.println("📈 [" + java.time.LocalDateTime.now() + "] Cập nhật phạt #" + penaltyBill.getId() + 
                            " - Từ " + penaltyOverdueDays + " ngày thành " + currentOverdueDays + " ngày");
                        
                        // Xóa phạt cũ và tạo phạt mới với tỷ lệ đúng
                        billService.deleteBillById(penaltyBill.getId());
                        BillResponse newPenalty = billService.createLatePenaltyBill(originalBill.getId());
                        
                        System.out.println("✅ [" + java.time.LocalDateTime.now() + "] Đã cập nhật phạt #" + penaltyBill.getId() + 
                            " thành phạt #" + newPenalty.getId() + " - Số tiền: " + newPenalty.getTotalAmount() + " VNĐ");
                        updatedCount++;
                    } else {
                        System.out.println("ℹ️ [" + java.time.LocalDateTime.now() + "] Phạt #" + penaltyBill.getId() + 
                            " không cần cập nhật (" + penaltyOverdueDays + " ngày)");
                    }
                    
                } catch (Exception e) {
                    System.err.println("❌ [" + java.time.LocalDateTime.now() + "] Lỗi khi cập nhật phạt #" + penaltyBill.getId() + ": " + e.getMessage());
                    e.printStackTrace();
                }
            }
            
            if (updatedCount > 0) {
                log.info("✅ Đã cập nhật {} hóa đơn phạt tăng dần", updatedCount);
                System.out.println("✅ [" + java.time.LocalDateTime.now() + "] Hoàn thành: Đã cập nhật " + updatedCount + " hóa đơn phạt tăng dần");
            } else {
                log.debug("ℹ️ Không có hóa đơn phạt nào cần cập nhật");
                System.out.println("ℹ️ [" + java.time.LocalDateTime.now() + "] Không có hóa đơn phạt nào cần cập nhật");
            }
            
        } catch (Exception e) {
            log.error("❌ Lỗi khi cập nhật phạt tăng dần tự động", e);
            System.err.println("❌ [" + java.time.LocalDateTime.now() + "] Lỗi khi cập nhật phạt tăng dần tự động: " + e.getMessage());
            e.printStackTrace();
        }
    }

    /**
     * Chạy tự động mỗi phút để kiểm tra hóa đơn quá hạn
     */
    @Scheduled(cron = "0 * * * * ?") // Mỗi phút
    public void checkOverdueBillsScheduled() {
        log.debug("🔍 Kiểm tra hóa đơn quá hạn mỗi phút...");
        
        try {
            List<BillResponse> overdueBills = billService.getOverdueBills().stream()
                .map(billService::toResponse)
                .toList();
            
            if (!overdueBills.isEmpty()) {
                log.info("⚠️ Phát hiện {} hóa đơn quá hạn", overdueBills.size());
                for (BillResponse bill : overdueBills) {
                    log.info("📋 Hóa đơn #{} - Phòng {} - Số tiền: {} VNĐ", 
                        bill.getId(), bill.getRoomNumber(), bill.getTotalAmount());
                }
            } else {
                log.debug("✅ Không có hóa đơn quá hạn");
            }
        } catch (Exception e) {
            log.error("❌ Lỗi khi kiểm tra hóa đơn quá hạn", e);
        }
    }
    
    /**
     * Chạy tự động hàng ngày lúc 8h sáng để kiểm tra và tạo phạt quá hạn
     * Job này đảm bảo không bỏ sót hóa đơn nào
     */
    @Scheduled(cron = "0 0 8 * * ?") // 8h sáng hàng ngày
    public void dailyLatePenaltyCheck() {
        log.info("🌅 Bắt đầu kiểm tra phạt quá hạn hàng ngày lúc 8h sáng...");
        
        try {
            List<BillResponse> createdPenalties = billService.checkAndCreateLatePenalties();
            
            if (!createdPenalties.isEmpty()) {
                log.info("✅ [DAILY] Đã tạo {} hóa đơn phạt trong ngày", createdPenalties.size());
                for (BillResponse penalty : createdPenalties) {
                    log.info("📄 [DAILY] Hóa đơn phạt #{} cho hóa đơn gốc #{} - Số tiền: {} VNĐ", 
                        penalty.getId(), penalty.getOriginalBillId(), penalty.getTotalAmount());
                }
            } else {
                log.info("ℹ️ [DAILY] Không có hóa đơn nào cần tạo phạt trong ngày");
            }
        } catch (Exception e) {
            log.error("❌ [DAILY] Lỗi khi kiểm tra phạt quá hạn hàng ngày", e);
        }
    }
    
    /**
     * Chạy tự động hàng ngày lúc 9h sáng để kiểm tra hóa đơn quá hạn
     */
    @Scheduled(cron = "0 0 9 * * ?") // 9h sáng hàng ngày
    public void dailyOverdueBillsCheck() {
        log.info("🌅 Bắt đầu kiểm tra hóa đơn quá hạn hàng ngày lúc 9h sáng...");
        
        try {
            List<BillResponse> overdueBills = billService.getOverdueBills().stream()
                .map(billService::toResponse)
                .toList();
            
            if (!overdueBills.isEmpty()) {
                log.info("⚠️ [DAILY] Phát hiện {} hóa đơn quá hạn trong ngày", overdueBills.size());
                for (BillResponse bill : overdueBills) {
                    log.info("📋 [DAILY] Hóa đơn #{} - Phòng {} - Số tiền: {} VNĐ - Loại: {}", 
                        bill.getId(), bill.getRoomNumber(), bill.getTotalAmount(), bill.getBillType());
                }
            } else {
                log.info("✅ [DAILY] Không có hóa đơn quá hạn trong ngày");
            }
        } catch (Exception e) {
            log.error("❌ [DAILY] Lỗi khi kiểm tra hóa đơn quá hạn hàng ngày", e);
        }
    }
}