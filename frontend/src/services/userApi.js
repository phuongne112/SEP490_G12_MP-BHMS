import axiosClient from "./axiosClient";

export const getAllUsers = async (params) => {
  return axiosClient.get("/users", { params });
};

export const createUser = async (userData) => {
  return axiosClient.post("/users", userData);
};

export const updateUser = async (oldEmail, updatedData) => {
  return axiosClient.put(`/users/${oldEmail}`, updatedData);
};
