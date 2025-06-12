import axiosClient from "./axiosClient";

export const getAllPermissions = async (params) => {
  return await axiosClient.get("/permissions", { params });
};

export const createPermission = (data) => {
  return axiosClient.post("/permissions", data);
};

export const updatePermission = (data) => {
  return axiosClient.put("/permissions", data); // KHÔNG cần truyền id trong URL
};

export const deletePermission = (id) => {
  return axiosClient.delete(`/permissions/${id}`);
};
