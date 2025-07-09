import axiosClient from "./axiosClient";

export const getAllAssets = async (page = 0, size = 10, filters = {}) => {
  let url = `/assets?page=${page}&size=${size}`;
  if (filters.assetName) url += `&assetName=${encodeURIComponent(filters.assetName)}`;
  if (filters.assetStatus) url += `&assetStatus=${encodeURIComponent(filters.assetStatus)}`;
  if (filters.minQuantity !== undefined && filters.minQuantity !== null && filters.minQuantity !== '') url += `&minQuantity=${filters.minQuantity}`;
  if (filters.maxQuantity !== undefined && filters.maxQuantity !== null && filters.maxQuantity !== '') url += `&maxQuantity=${filters.maxQuantity}`;
  // Có thể bổ sung các filter khác nếu backend hỗ trợ
  const response = await axiosClient.get(url);
  return response;
};

export const addAsset = async (formData) => {
  const response = await axiosClient.post("/assets", formData, {
    headers: { 'Content-Type': undefined }
  });
  return response;
};

export const updateAsset = async (id, formData) => {
  const response = await axiosClient.put(`/assets/${id}`, formData, {
    headers: { 'Content-Type': undefined }
  });
  return response;
};

export const deleteAsset = async (id) => {
  const response = await axiosClient.delete(`/assets/${id}`);
  return response;
};

// Lấy asset theo roomId cho renter
export const getAssetsByRoomId = async (roomId) => {
  const url = `/assets?roomId=${encodeURIComponent(roomId)}`;
  const response = await axiosClient.get(url);
  return response;
};

export const assignAssetToRoom = async (assetId, roomId) => {
  const response = await axiosClient.post(`/assets/${assetId}/assign-room`, { roomId });
  return response;
};

export const getAssetInventoryByRoom = async (roomNumber) => {
  const response = await axiosClient.get(`/asset-inventory/by-room?roomNumber=${encodeURIComponent(roomNumber)}`);
  return response;
};

export const getAssetInventoryByRoomAndContract = async (roomNumber, contractId) => {
  const response = await axiosClient.get(`/asset-inventory/by-room-contract?roomNumber=${encodeURIComponent(roomNumber)}&contractId=${contractId}`);
  return response;
};
