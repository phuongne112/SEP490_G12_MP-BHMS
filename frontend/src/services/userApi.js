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

export const updateUser = async (oldEmail, updatedData) => {
  return axiosClient.put(`/users/${oldEmail}`, updatedData);
};

export const updateUserStatus = (id, body) => {
  return axiosClient.put(`/users/${id}/status`, body);
};
