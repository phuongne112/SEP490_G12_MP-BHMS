package com.mpbhms.backend.service.impl;

import com.mpbhms.backend.dto.AddUsersToRoomRequest;
import com.mpbhms.backend.entity.Contract;
import com.mpbhms.backend.entity.Room;
import com.mpbhms.backend.entity.RoomUser;
import com.mpbhms.backend.entity.User;
import com.mpbhms.backend.entity.ContractRenterInfo;
import com.mpbhms.backend.enums.ContractStatus;
import com.mpbhms.backend.enums.PaymentCycle;
import com.mpbhms.backend.repository.ContractRepository;
import com.mpbhms.backend.repository.RoomRepository;
import com.mpbhms.backend.repository.RoomUserRepository;
import com.mpbhms.backend.repository.UserRepository;
import com.mpbhms.backend.repository.ContractRenterInfoRepository;
import com.mpbhms.backend.repository.ServiceRepository;
import com.mpbhms.backend.repository.ServiceReadingRepository;
import com.mpbhms.backend.service.RoomUserService;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.Instant;

@Service
@RequiredArgsConstructor
public class RoomUserServiceImpl implements RoomUserService {

    private final RoomRepository roomRepository;
    private final UserRepository userRepository;
    private final RoomUserRepository roomUserRepository;
    private final ContractRepository contractRepository;
    private final ContractRenterInfoRepository contractRenterInfoRepository;
    private final ServiceRepository serviceRepository;
    private final ServiceReadingRepository serviceReadingRepository;

    @Override
    @Transactional
    public void addUsersToRoom(AddUsersToRoomRequest request) {
        // Kiểm tra logic thời gian hợp đồng theo chu kỳ thanh toán
        Instant startInstant = request.getContractStartDate();
        Instant endInstant = request.getContractEndDate();
        if (startInstant == null || endInstant == null) {
            throw new RuntimeException("Vui lòng chọn ngày bắt đầu và ngày kết thúc hợp đồng.");
        }
        java.time.LocalDate startDate = startInstant.atZone(java.time.ZoneId.systemDefault()).toLocalDate();
        java.time.LocalDate endDate = endInstant.atZone(java.time.ZoneId.systemDefault()).toLocalDate();
        long monthsBetween = java.time.temporal.ChronoUnit.MONTHS.between(startDate, endDate);
        switch (request.getPaymentCycle()) {
            case "MONTHLY":
                if (monthsBetween <= 0 || monthsBetween % 1 != 0) {
                    throw new RuntimeException("Thời gian hợp đồng phải là bội số của 1 tháng cho chu kỳ thanh toán hàng tháng.");
                }
                break;
            case "QUARTERLY":
                if (monthsBetween <= 0 || monthsBetween % 3 != 0) {
                    throw new RuntimeException("Thời gian hợp đồng phải là bội số của 3 tháng cho chu kỳ thanh toán theo quý.");
                }
                break;
            case "SEMI_ANNUALLY":
                if (monthsBetween <= 0 || monthsBetween % 6 != 0) {
                    throw new RuntimeException("Thời gian hợp đồng phải là bội số của 6 tháng cho chu kỳ thanh toán nửa năm.");
                }
                break;
            case "ANNUALLY":
                if (monthsBetween <= 0 || monthsBetween % 12 != 0) {
                    throw new RuntimeException("Thời gian hợp đồng phải là bội số của 12 tháng cho chu kỳ thanh toán hàng năm.");
                }
                break;
        }
        Room roomWithServices = roomRepository.findById(request.getRoomId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy phòng."));

        // Kiểm tra xem phòng đã có hợp đồng ĐANG HOẠT ĐỘNG chưa
        java.util.List<Contract> existingContracts = contractRepository.findByRoomId(roomWithServices.getId());
        boolean hasActiveContract = existingContracts.stream()
            .anyMatch(contract -> {
                boolean isActive = contract.getContractStatus() == com.mpbhms.backend.enums.ContractStatus.ACTIVE;
                boolean isInTimeRange = contract.getContractStartDate() != null && 
                                      contract.getContractEndDate() != null &&
                                      java.time.Instant.now().isAfter(contract.getContractStartDate()) &&
                                      java.time.Instant.now().isBefore(contract.getContractEndDate());
                return isActive && isInTimeRange;
            });
        
        if (hasActiveContract) {
            throw new RuntimeException("Phòng này đã có hợp đồng đang hoạt động trong thời gian hiệu lực. Không thể gán thêm người thuê mới.");
        }

        // Đếm số người hiện tại trong phòng
        int currentCount = roomUserRepository.countByRoomId(roomWithServices.getId());
        if (currentCount + request.getUserIds().size() > roomWithServices.getMaxOccupants()) {
            throw new IllegalArgumentException("Vượt quá số người tối đa của phòng.");
        }

        // Tạo hợp đồng trước
        Contract contract = new Contract();
        contract.setRoom(roomWithServices);
        contract.setContractStartDate(request.getContractStartDate());
        contract.setContractEndDate(request.getContractEndDate());
        contract.setDepositAmount(request.getDepositAmount());
        contract.setRentAmount(roomWithServices.getPricePerMonth());
        contract.setPaymentCycle(PaymentCycle.valueOf(request.getPaymentCycle()));
        contract.setContractStatus(ContractStatus.ACTIVE);
        contract = contractRepository.save(contract);

        // Tạo RoomUser và gán hợp đồng cho từng người dùng
        for (Long userId : request.getUserIds()) {
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng."));

            RoomUser roomUser = new RoomUser();
            roomUser.setRoom(roomWithServices);
            roomUser.setUser(user);
            roomUser.setJoinedAt(request.getContractStartDate());
            roomUser.setContract(contract);
            roomUserRepository.save(roomUser);

            // Lưu snapshot thông tin người thuê vào ContractRenterInfo
            if (user.getUserInfo() != null) {
                ContractRenterInfo info = new ContractRenterInfo();
                info.setContract(contract);
                info.setFullName(user.getUserInfo().getFullName());
                info.setPhoneNumber(user.getUserInfo().getPhoneNumber());
                info.setNationalID(user.getUserInfo().getNationalID());
                info.setPermanentAddress(user.getUserInfo().getPermanentAddress());
                contractRenterInfoRepository.save(info);
            }
        }

        // Tạo ServiceReading cho dịch vụ điện nếu phòng có dịch vụ này và chưa có reading nào
        com.mpbhms.backend.entity.CustomService electricityService = serviceRepository.findByServiceType(com.mpbhms.backend.enums.ServiceType.ELECTRICITY);
        if (electricityService != null && roomWithServices.getServices() != null && roomWithServices.getServices().contains(electricityService)) {
            java.util.Optional<com.mpbhms.backend.entity.ServiceReading> existingReading = serviceReadingRepository.findTopByRoomAndServiceOrderByCreatedDateDesc(roomWithServices, electricityService);
            if (existingReading.isEmpty()) {
                com.mpbhms.backend.entity.ServiceReading reading = new com.mpbhms.backend.entity.ServiceReading();
                reading.setRoom(roomWithServices);
                reading.setService(electricityService);
                reading.setOldReading(java.math.BigDecimal.ZERO);
                reading.setNewReading(java.math.BigDecimal.ZERO);
                serviceReadingRepository.save(reading);
            }
        }
    }

    @Override
    @Transactional
    public void leaveRoom(Long roomUserId) {
        RoomUser roomUser = roomUserRepository.findById(roomUserId)
            .orElseThrow(() -> new RuntimeException("Không tìm thấy thông tin người dùng trong phòng."));
        
        Contract contract = roomUser.getContract();
        Room room = roomUser.getRoom();
        
        // Đánh dấu người dùng đã rời phòng thay vì xóa hẳn
        roomUser.setIsActive(false);
        roomUser.setLeftAt(Instant.now());
        roomUserRepository.save(roomUser);
        
        // Nếu có hợp đồng liên quan, xử lý logic phức tạp
        if (contract != null) {
            // Lấy lại danh sách RoomUser còn active của hợp đồng này
            java.util.List<RoomUser> activeRoomUsers = roomUserRepository.findByContractIdAndIsActiveTrue(contract.getId());
            
            if (activeRoomUsers.isEmpty()) {
                // Không còn ai trong phòng - kết thúc hợp đồng
                contract.setContractStatus(ContractStatus.TERMINATED);
                contractRepository.save(contract);
                
                // Cập nhật trạng thái phòng thành "Còn trống"
                room.setRoomStatus(com.mpbhms.backend.enums.RoomStatus.Available);
                roomRepository.save(room);
            } else {
                // Vẫn còn người ở lại - cần xử lý logic phân chia tiền phòng
                handlePartialContractTermination(contract, roomUser, activeRoomUsers);
            }
        }
    }
    
    /**
     * Xử lý logic khi chỉ một số người rời phòng, những người khác vẫn ở lại
     */
    private void handlePartialContractTermination(Contract contract, RoomUser leavingUser, 
                                                 java.util.List<RoomUser> remainingUsers) {
        // Logic: Tạo hợp đồng mới cho những người ở lại
        if (remainingUsers.size() > 0) {
            // Tạo hợp đồng mới với thời gian còn lại
            Contract newContract = new Contract();
            newContract.setRoom(contract.getRoom());
            newContract.setContractStartDate(Instant.now());
            newContract.setContractEndDate(contract.getContractEndDate()); // Giữ nguyên ngày kết thúc
            newContract.setDepositAmount(contract.getDepositAmount());
            newContract.setRentAmount(contract.getRentAmount());
            newContract.setPaymentCycle(contract.getPaymentCycle());
            newContract.setContractStatus(ContractStatus.ACTIVE);
            newContract = contractRepository.save(newContract);
            
            // Cập nhật contract cho những người ở lại
            for (RoomUser remainingUser : remainingUsers) {
                remainingUser.setContract(newContract);
                roomUserRepository.save(remainingUser);
                
                // Tạo ContractRenterInfo mới cho hợp đồng mới
                if (remainingUser.getUser() != null && remainingUser.getUser().getUserInfo() != null) {
                    ContractRenterInfo info = new ContractRenterInfo();
                    info.setContract(newContract);
                    info.setFullName(remainingUser.getUser().getUserInfo().getFullName());
                    info.setPhoneNumber(remainingUser.getUser().getUserInfo().getPhoneNumber());
                    info.setNationalID(remainingUser.getUser().getUserInfo().getNationalID());
                    info.setPermanentAddress(remainingUser.getUser().getUserInfo().getPermanentAddress());
                    contractRenterInfoRepository.save(info);
                }
            }
            
            // Đánh dấu hợp đồng cũ là ĐÃ KẾT THÚC
            contract.setContractStatus(ContractStatus.TERMINATED);
            contractRepository.save(contract);
        }
    }
}

