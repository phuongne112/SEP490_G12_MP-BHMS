import axiosClient from "./axiosClient";

export const getAllUsers = async (params) => {
  return axiosClient.get("/users", { params });
};

export const createUser = async (userData) => {
  return axiosClient.post("/users", userData);
};
