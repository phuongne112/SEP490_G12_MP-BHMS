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

export const updateUserStatus = (id, body) => {
  return axiosClient.put(`/users/${id}/status`, body);
};

export const deleteNotification = async (id) => {
  return axiosClient.delete(`/notifications/${id}`);
};
export const getAccountInfo = async () => {
  const res = await axiosClient.get('users/me/account');
  return res.data;
};

export const getPersonalInfo = async () => {
  const res = await axiosClient.get('users/me/info');
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