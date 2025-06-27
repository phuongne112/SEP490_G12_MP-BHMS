import axiosClient from "./axiosClient";

export const getAllAssets = async (page = 0, size = 10, filters = {}) => {
  let url = `/assets?page=${page}&size=${size}`;
  if (filters.assetName) url += `&assetName=${encodeURIComponent(filters.assetName)}`;
  // Có thể bổ sung các filter khác nếu backend hỗ trợ
  const response = await axiosClient.get(url);
  return response;
};

export const addAsset = async (formData) => {
  const response = await axiosClient.post("/assets", formData);
  return response;
};

export const updateAsset = async (id, formData) => {
  const response = await axiosClient.put(`/assets/${id}`, formData);
  return response;
};

export const deleteAsset = async (id) => {
  const response = await axiosClient.delete(`/assets/${id}`);
  return response;
};
