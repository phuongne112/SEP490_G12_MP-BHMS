package com.mpbhms.backend.service.impl;

import com.mpbhms.backend.dto.AddUsersToRoomRequest;
import com.mpbhms.backend.entity.Contract;
import com.mpbhms.backend.entity.Room;
import com.mpbhms.backend.entity.RoomUser;
import com.mpbhms.backend.entity.User;
import com.mpbhms.backend.enums.ContractStatus;
import com.mpbhms.backend.enums.PaymentCycle;
import com.mpbhms.backend.repository.ContractRepository;
import com.mpbhms.backend.repository.RoomRepository;
import com.mpbhms.backend.repository.RoomUserRepository;
import com.mpbhms.backend.repository.UserRepository;
import com.mpbhms.backend.service.RoomUserService;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class RoomUserServiceImpl implements RoomUserService {

    private final RoomRepository roomRepository;
    private final UserRepository userRepository;
    private final RoomUserRepository roomUserRepository;
    private final ContractRepository contractRepository;

    @Override
    @Transactional
    public void addUsersToRoom(AddUsersToRoomRequest request) {
        Room room = roomRepository.findById(request.getRoomId())
                .orElseThrow(() -> new RuntimeException("Room not found"));

        int currentCount = roomUserRepository.countByRoomId(room.getId());
        if (currentCount + request.getUserIds().size() > room.getMaxOccupants()) {
            throw new IllegalArgumentException("Vượt quá số người tối đa của phòng.");
        }

        for (Long userId : request.getUserIds()) {
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            // Tạo RoomUser
            RoomUser roomUser = new RoomUser();
            roomUser.setRoom(room);
            roomUser.setUser(user);
            roomUser.setJoinedAt(request.getContractStartDate());
            roomUser = roomUserRepository.save(roomUser);

            // Tạo Contract
            Contract contract = new Contract();
            contract.setRoom(room);
            contract.setRoomUser(roomUser);
            contract.setContractStartDate(request.getContractStartDate());
            contract.setContractEndDate(request.getContractEndDate());
            contract.setDepositAmount(request.getDepositAmount());
            contract.setRentAmount(room.getPricePerMonth());
            contract.setPaymentCycle(PaymentCycle.valueOf(request.getPaymentCycle()));
            contract.setContractStatus(ContractStatus.ACTIVE);
            contractRepository.save(contract);
        }
    }
}

