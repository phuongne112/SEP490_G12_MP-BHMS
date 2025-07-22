import axiosClient from "./axiosClient";

/**
 * Lấy danh sách phòng với phân trang và filter DSL.
 * @param {number} page - Số trang (bắt đầu từ 0).
 * @param {number} size - Kích thước trang.
 * @param {string} filter - Chuỗi filter DSL.
 */
export const getAllRooms = async (page = 0, size = 9, filter = "", sort = "") => {
  let url = `/rooms?page=${page}&size=${size}`;
  if (filter) {
    url += `&filter=${encodeURIComponent(filter)}`;
  }
  if (sort) {
    url += `&sort=${encodeURIComponent(sort)}`;
  }

  const response = await axiosClient.get(url);
  return response.data;
};

export const getAllRoomsNoPaging = async () => {
  const response = await axiosClient.get("rooms/all");
  return response.data;
};

export const updateRoomStatus = async (roomId, status) => {
  const response = await axiosClient.patch(`/rooms/${roomId}/status`, { roomStatus: status });
  return response.data;
};

export const toggleRoomActiveStatus = async (roomId) => {
  const response = await axiosClient.patch(`/rooms/${roomId}/active`);
  return response.data;
};

/**
 * Người thuê rời khỏi phòng
 * @param {number} roomUserId - ID của RoomUser cần xóa
 */
export const leaveRoom = async (roomUserId) => {
  const response = await axiosClient.post(`/room-users/leave/${roomUserId}`);
  return response.data;
};

/**
 * Lấy danh sách phòng có người thuê
 */
export const getRoomsWithRenter = async () => {
  const response = await axiosClient.get("/rooms/with-renter");
  return response.data;
};

export const deleteRoom = async (roomId) => {
  const response = await axiosClient.delete(`/rooms/${roomId}`);
  return response.data;
};

/**
 * Thêm service cho phòng
 * @param {number} roomId
 * @param {number} serviceId
 * @param {string} initialReading - Chỉ số ban đầu (tùy chọn, cho dịch vụ điện)
 */
export const addServiceToRoom = async (roomId, serviceId, initialReading = null) => {
  const requestBody = { serviceId };
  if (initialReading !== null) {
    requestBody.initialReading = initialReading;
  }
  const response = await axiosClient.post(`/rooms/${roomId}/add-service`, requestBody);
  return response.data;
};

/**
 * Lấy thông tin phòng hiện tại của người thuê
 */
export const getMyRoom = async () => {
  const response = await axiosClient.get("/room-users/my-room");
  return response.data;
};

export const getRoomsWithElectricReadings = async () => {
  const response = await axiosClient.get("rooms/with-electric-readings");
  return response.data;
};

/**
 * Ngừng sử dụng dịch vụ cho phòng
 */
export const deactivateServiceForRoom = async (roomId, serviceId) => {
  return axiosClient.patch(`/rooms/${roomId}/deactivate-service/${serviceId}`);
};

/**
 * Sử dụng lại dịch vụ đã ngừng cho phòng
 */
export const reactivateServiceForRoom = async (roomId, serviceId) => {
  return axiosClient.patch(`/rooms/${roomId}/reactivate-service/${serviceId}`);
};

// Lấy tổng số phòng hiện tại
export const getRoomStats = async () => {
  // Lấy tất cả phòng với size lớn để đếm (hoặc backend nên có API riêng)
  const res = await getAllRooms(0, 1000);
  const rooms = res?.result || [];
  return { total: rooms.length };
};

// Lấy chi tiết phòng theo id
export const getRoomById = async (id) => {
  const response = await axiosClient.get(`/rooms/${id}`);
  return response.data;
};
