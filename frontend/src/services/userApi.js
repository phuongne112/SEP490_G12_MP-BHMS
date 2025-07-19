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

export const ocrCccd = async (frontFile, backFile) => {
  const formData = new FormData();
  formData.append("front", frontFile);
  formData.append("back", backFile);
  const res = await axiosClient.post("/ocr/cccd", formData, {
    headers: { "Content-Type": "multipart/form-data" }
  });
  return res;
};
