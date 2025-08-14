package com.mpbhms.backend.service.impl;

import com.mpbhms.backend.dto.AddUsersToRoomRequest;
import com.mpbhms.backend.entity.Contract;
import com.mpbhms.backend.entity.Room;
import com.mpbhms.backend.entity.RoomUser;
import com.mpbhms.backend.entity.User;
import com.mpbhms.backend.entity.ContractRenterInfo;
import com.mpbhms.backend.enums.ContractStatus;
import com.mpbhms.backend.enums.PaymentCycle;
import com.mpbhms.backend.enums.RoomStatus;
import com.mpbhms.backend.repository.ContractRepository;
import com.mpbhms.backend.repository.RoomRepository;
import com.mpbhms.backend.repository.RoomUserRepository;
import com.mpbhms.backend.repository.UserRepository;
import com.mpbhms.backend.repository.ContractRenterInfoRepository;
import com.mpbhms.backend.repository.ServiceRepository;
import com.mpbhms.backend.repository.ServiceReadingRepository;
import com.mpbhms.backend.service.RoomUserService;
import com.mpbhms.backend.service.RoomService;
import com.mpbhms.backend.util.CurrentUserUtil;
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
    private final RoomService roomService;

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
        contract.setDepositAmount(request.getDepositAmount() != null ? 
            java.math.BigDecimal.valueOf(request.getDepositAmount()) : null);
        contract.setRentAmount(roomWithServices.getPricePerMonth());
        contract.setPaymentCycle(PaymentCycle.valueOf(request.getPaymentCycle()));
        contract.setContractStatus(ContractStatus.ACTIVE);
        contract = contractRepository.save(contract);
        
        // Sinh số hợp đồng tự động
        String year = java.time.LocalDate.now().getYear() + "";
        String contractNumber = String.format("HD-%s-%05d", year, contract.getId());
        contract.setContractNumber(contractNumber);
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

        // Cập nhật trạng thái phòng thành "Đã thuê" sau khi gán người thuê thành công
        if (roomWithServices.getRoomStatus() == RoomStatus.Available) {
            roomService.updateRoomStatus(roomWithServices.getId(), RoomStatus.Occupied.name());
        }
    }

    @Override
    @Transactional
    public void leaveRoom(Long roomUserId) {
        RoomUser roomUser = roomUserRepository.findById(roomUserId)
            .orElseThrow(() -> new RuntimeException("Không tìm thấy thông tin người thuê"));
        
        if (!Boolean.TRUE.equals(roomUser.getIsActive())) {
            throw new RuntimeException("Người thuê này không còn hoạt động");
        }
        
        Room room = roomUser.getRoom();
        if (room == null) {
            throw new RuntimeException("Không tìm thấy thông tin phòng");
        }
        
        // Xóa RoomUser
        roomUserRepository.delete(roomUser);
        
        // Kiểm tra xem phòng còn người thuê nào không
        int activeUserCount = roomUserRepository.countByRoomId(room.getId());
        if (activeUserCount == 0) {
            // Nếu không còn người thuê nào, cập nhật trạng thái phòng thành "Available"
            roomService.updateRoomStatus(room.getId(), RoomStatus.Available.name());
        }
    }



    @Override
    public Room getCurrentRenterRoom() {
        String username = com.mpbhms.backend.util.CurrentUserUtil.getCurrentUserLogin().orElse(null);
        System.out.println("Current username: " + username);
        if (username == null) return null;
        User user = userRepository.findByUsername(username);
        if (user == null) {
            user = userRepository.findByEmail(username);
        }
        System.out.println("User: " + user);
        if (user == null) return null;
        RoomUser roomUser = roomUserRepository.findTopByUserIdOrderByJoinedAtDesc(user.getId());
        System.out.println("RoomUser: " + roomUser);
        if (roomUser == null || !Boolean.TRUE.equals(roomUser.getIsActive())) return null;
        System.out.println("Room: " + (roomUser != null ? roomUser.getRoom() : null));
        return roomUser.getRoom();
    }

    @Override
    public java.util.Map<String, Object> getCurrentRenterRoomDetail() {
        String username = com.mpbhms.backend.util.CurrentUserUtil.getCurrentUserLogin().orElse(null);
        if (username == null) return null;
        User user = userRepository.findByUsername(username);
        if (user == null) {
            user = userRepository.findByEmail(username);
        }
        if (user == null) return null;
        RoomUser roomUser = roomUserRepository.findTopByUserIdOrderByJoinedAtDesc(user.getId());
        if (roomUser == null || !Boolean.TRUE.equals(roomUser.getIsActive())) return null;
        Room room = roomUser.getRoom();
        if (room == null) return null;
        // Lấy hợp đồng ACTIVE mới nhất của phòng, nếu không có thì lấy hợp đồng có contractEndDate lớn nhất
        Contract contract = contractRepository.findActiveByRoomId(room.getId()).orElse(null);
        if (contract == null) {
            java.util.List<Contract> allContracts = contractRepository.findByRoomId(room.getId());
            if (!allContracts.isEmpty()) {
                contract = allContracts.stream().max(java.util.Comparator.comparing(Contract::getContractEndDate)).orElse(null);
            }
        }
        User landlord = room.getLandlord();
        com.mpbhms.backend.entity.UserInfo landlordInfo = landlord != null ? landlord.getUserInfo() : null;
        java.util.List<RoomUser> roommates = room.getRoomUsers() != null ?
            room.getRoomUsers().stream().filter(ru -> Boolean.TRUE.equals(ru.getIsActive())).toList() : java.util.Collections.emptyList();
        java.util.List<com.mpbhms.backend.entity.CustomService> services = room.getServices() != null ? room.getServices() : java.util.Collections.emptyList();
        java.util.List<com.mpbhms.backend.entity.Asset> assets = room.getAssets() != null ? room.getAssets() : java.util.Collections.emptyList();
        java.util.List<String> images = room.getImages() != null ?
            room.getImages().stream().map(img -> img.getImageURL() != null ? img.getImageURL() : "").toList() : java.util.Collections.emptyList();

        java.util.Map<String, Object> dto = new java.util.HashMap<>();
        dto.put("id", room.getId());
        dto.put("roomId", room.getId());
        dto.put("roomNumber", room.getRoomNumber());
        dto.put("building", room.getBuilding());
        dto.put("area", room.getArea());
        dto.put("pricePerMonth", room.getPricePerMonth());
        dto.put("maxOccupants", room.getMaxOccupants());
        dto.put("status", room.getRoomStatus() != null ? room.getRoomStatus().name() : null);
        dto.put("description", room.getDescription());
        dto.put("images", images);
        java.util.Map<String, Object> landlordDto = new java.util.HashMap<>();
        if (landlord != null) {
            landlordDto.put("username", landlord.getUsername());
            landlordDto.put("email", landlord.getEmail());
            if (landlordInfo != null) {
                landlordDto.put("fullName", landlordInfo.getFullName());
                landlordDto.put("phoneNumber", landlordInfo.getPhoneNumber());
            }
        }
        dto.put("landlord", landlordDto);
        java.util.List<java.util.Map<String, Object>> serviceDtos = services.stream().map(s -> {
            java.util.Map<String, Object> m = new java.util.HashMap<>();
            m.put("serviceName", s.getServiceName());
            m.put("serviceType", s.getServiceType() != null ? s.getServiceType().name() : null);
            m.put("unit", s.getUnit());
            m.put("unitPrice", s.getUnitPrice());
            return m;
        }).toList();
        dto.put("services", serviceDtos);
        java.util.List<java.util.Map<String, Object>> assetDtos = assets.stream().map(a -> {
            java.util.Map<String, Object> m = new java.util.HashMap<>();
            m.put("assetName", a.getAssetName());
            m.put("quantity", a.getQuantity());
            m.put("assetImage", a.getAssetImage());
            return m;
        }).toList();
        dto.put("assets", assetDtos);
        if (contract != null) {
            java.util.Map<String, Object> contractDto = new java.util.HashMap<>();
            contractDto.put("id", contract.getId());
            contractDto.put("contractId", contract.getId());
            contractDto.put("contractStartDate", contract.getContractStartDate());
            contractDto.put("contractEndDate", contract.getContractEndDate());
            contractDto.put("contractStatus", contract.getContractStatus() != null ? contract.getContractStatus().name() : null);
            contractDto.put("depositAmount", contract.getDepositAmount());
            contractDto.put("rentAmount", contract.getRentAmount());
            contractDto.put("paymentCycle", contract.getPaymentCycle() != null ? contract.getPaymentCycle().name() : null);
            dto.put("contract", contractDto);
        }
        java.util.List<java.util.Map<String, Object>> roommateDtos = roommates.stream().map(ru -> {
            java.util.Map<String, Object> m = new java.util.HashMap<>();
            if (ru.getUser() != null && ru.getUser().getUserInfo() != null) {
                m.put("fullName", ru.getUser().getUserInfo().getFullName());
            }
            m.put("joinedAt", ru.getJoinedAt());
            return m;
        }).toList();
        dto.put("roommates", roommateDtos);
        return dto;
    }
}

