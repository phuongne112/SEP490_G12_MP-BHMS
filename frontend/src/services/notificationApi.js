import axiosClient from "./axiosClient";

export const sendNotification = async (data) => {
  return axiosClient.post("/notifications/send", data);
};
export const deleteNotification = async (id) => {
  return axiosClient.delete(`/notifications/${id}`); // ✅ đúng cú pháp
};
export const getAllNotifications = async (page = 0, size = 5, filter = "") => {
  let url = `/notifications/all?page=${page}&size=${size}`;
  if (filter) {
    url += `&filter=${encodeURIComponent(filter)}`;
  }
  const response = await axiosClient.get(url);
  return response.data; // ✅ TRẢ RA DATA!
};