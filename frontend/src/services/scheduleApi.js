import axiosClient from "./axiosClient";

const scheduleApi = {
  // Đặt lịch hẹn
  bookAppointment: (data) =>
    axiosClient.post("/schedules", data),
  // Lấy danh sách lịch hẹn (nếu cần)
  getAll: () => axiosClient.get("/schedules"),
  // Lấy chi tiết lịch hẹn theo id (nếu cần)
  getById: (id) => axiosClient.get(`/schedules/${id}`),
  // Cập nhật lịch hẹn
  update: (id, data) => axiosClient.put(`/schedules/${id}`, data),
  // Xóa lịch hẹn (nếu cần)
  delete: (id) => axiosClient.delete(`/schedules/${id}`),
  
  // API cho landlord
  // Lấy danh sách booking cho landlord
  getByLandlord: (landlordId) => axiosClient.get(`/schedules/landlord?landlordId=${landlordId}`),
  // Cập nhật trạng thái booking (xác nhận/từ chối)
  updateStatus: (id, status) => axiosClient.patch(`/schedules/${id}/status?status=${status}`),
  // Tìm kiếm và lọc booking cho landlord
  searchAndFilter: (params) => axiosClient.get("/schedules", { params }),
  // Lấy booking của user (theo email hoặc renterId)
  getMySchedules: (params) => axiosClient.get("/schedules/my", { params }),
};

export default scheduleApi; 