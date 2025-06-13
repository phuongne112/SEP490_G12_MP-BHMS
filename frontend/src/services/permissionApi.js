import axiosClient from "./axiosClient";

export const getAllPermissions = async (page = 0, size = 5, filter = "") => {
  let url = `/permissions?page=${page}&size=${size}`;
  if (filter) {
    url += `&filter=${encodeURIComponent(filter)}`;
  }
  const response = await axiosClient.get(url);
  return response.data; // ✅ TRẢ RA DATA!
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

