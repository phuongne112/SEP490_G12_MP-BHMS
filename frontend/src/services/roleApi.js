import axiosClient from "./axiosClient";

// 🆕 Lấy tất cả permission
export const getAllPermissions = () => {
  return axiosClient.get("/permissions", {
    params: {
      page: 0,
      size: 1000, // hoặc một số lớn để lấy hết tất cả
    },
  });
};

// 🆕 Lấy permission theo module
export const getPermissionsByModule = async (moduleName) => {
  return axiosClient.get(`/permissions/module/${moduleName}`);
};

export const createRole = async (data) => {
  return axiosClient.post("/roles", data);
};

export const updateRole = async (data) => {
  return axiosClient.put(`/roles`, data);
};
export const deleteRole = async (id) => {
  return axiosClient.delete(`/roles/${id}`);
};

export const getAllRoles = async (page = 0, size = 5, filter = "") => {
  let url = `/roles?page=${page}&size=${size}`;
  if (filter) {
    url += `&filter=${encodeURIComponent(filter)}`;
  }
  const response = await axiosClient.get(url);
  return response.data; // ✅ TRẢ RA DATA!
};
