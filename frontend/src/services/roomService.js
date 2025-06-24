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
