// services/userApi.js
import axiosClient from "./axiosClient";

export const getAllUsers = async (page = 0, size = 5, filter = "") => {
  let url = `/users?page=${page}&size=${size}`;
  if (filter) {
    url += `&filter=${encodeURIComponent(filter)}`;
  }
  const response = await axiosClient.get(url);
  return response.data; // ✅ TRẢ RA DATA!
};

export const createUser = async (userData) => {
  return axiosClient.post("/users", userData);
};

export const updateUser = (data) => {
  return axiosClient.put("/users", data);
};

export const updateUserStatus = (id, isActive) => {
  return axiosClient.put(`/users/${id}/active`, { isActive });
};

export const deleteNotification = async (id) => {
  return axiosClient.delete(`/notifications/${id}`);
};
export const getAccountInfo = async () => {
  const res = await axiosClient.get("users/me/account");
  return res.data;
};

export const getPersonalInfo = async () => {
  const res = await axiosClient.get("users/me/info");
  return res.data;
};

export const updateAccountInfo = async (data) => {
  const res = await axiosClient.put("users/me/account", data);
  return res.data;
};

export const updatePersonalInfo = async (data) => {
  const res = await axiosClient.put("users/me/info", data);
  return res.data;
};

export const createPersonalInfo = async (data) => {
  const res = await axiosClient.post("users/me/info", data);
  return res.data;
};

// Lấy tổng số user và phân loại user theo role
export const getUserStats = async () => {
  // Lấy tất cả user với size lớn để đếm (hoặc backend nên có API riêng)
  const res = await getAllUsers(0, 1000);
  const users = res?.result || [];
  const stats = { total: 0, admin: 0, renter: 0, guest: 0 };
  users.forEach(u => {
    const role = u.role?.roleName?.toUpperCase?.() || "GUEST";
    if (role === "ADMIN") stats.admin++;
    else if (role === "RENTER") stats.renter++;
    else stats.guest++;
    stats.total++;
  });
  return stats;
};
