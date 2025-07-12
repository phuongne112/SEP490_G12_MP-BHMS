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
};

export default scheduleApi; 