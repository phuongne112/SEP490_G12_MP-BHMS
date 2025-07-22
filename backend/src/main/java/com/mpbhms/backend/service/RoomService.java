package com.mpbhms.backend.service;

import com.mpbhms.backend.dto.AddRoomDTO;
import com.mpbhms.backend.dto.ResultPaginationDTO;
import com.mpbhms.backend.dto.RoomDTO;
import com.mpbhms.backend.entity.ApiResponse;
import com.mpbhms.backend.entity.Room;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface RoomService {
    Room addRoom(AddRoomDTO request, MultipartFile[] images);

    ResultPaginationDTO getAllRooms(Specification<Room> spec, Pageable pageable);

    RoomDTO convertToRoomDTO(Room room);

    List<RoomDTO> convertToRoomDTOList(List<Room> rooms);
    Room updateRoom(Long id, AddRoomDTO request, List<Long> keepImageIds, MultipartFile[] images);
    void deleteRoom(Long id);

    void restoreRoom(Long id);

    void updateRoomStatus(Long id, String status);

    void toggleActiveStatus(Long id);

    ResultPaginationDTO getAllRoomsWithRenter(Pageable pageable);

    ResultPaginationDTO getDeletedRooms(Pageable pageable);

    Room getRoomById(Long id);

    /**
     * Thêm service cho phòng, nếu là điện thì tạo luôn ServiceReading với chỉ số ban đầu
     */
    boolean addServiceToRoom(Long roomId, Long serviceId);
    boolean addServiceToRoom(Long roomId, Long serviceId, java.math.BigDecimal initialReading);
    List<Room> getAllRoomsNoPaging();
    List<Room> getRoomsByIds(List<Long> ids);
    /**
     * Xóa service khỏi phòng (nếu chưa phát sinh hóa đơn liên quan)
     */
    boolean removeServiceFromRoom(Long roomId, Long serviceId);
    /**
     * Ngừng sử dụng dịch vụ cho phòng (set isActive=false, endDate=now)
     */
    void deactivateServiceForRoom(Long roomId, Long serviceId);
    /**
     * Sử dụng lại dịch vụ đã ngừng cho phòng (set isActive=true)
     */
    void reactivateServiceForRoom(Long roomId, Long serviceId);
    void updateScanFolder(Long id, String scanFolder);
}

