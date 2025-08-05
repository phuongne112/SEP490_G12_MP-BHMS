import axiosClient from "./axiosClient";

export const getAllAssets = async (page = 0, size = 10, filters = {}) => {
  let url = `/assets?page=${page}&size=${size}`;
  if (filters.assetName) url += `&assetName=${encodeURIComponent(filters.assetName)}`;
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

// RoomAsset APIs
export const getAssetsByRoom = async (roomId) => {
  const response = await axiosClient.get(`/room-assets/by-room?roomId=${roomId}`);
  return response;
};

export const addAssetToRoom = async ({ roomId, assetId, quantity, status, note }) => {
  const params = new URLSearchParams({ roomId, assetId, quantity, status });
  if (note) params.append('note', note);
  const response = await axiosClient.post(`/room-assets?${params.toString()}`);
  return response;
};

export const updateRoomAsset = async ({ id, quantity, status, note }) => {
  const params = new URLSearchParams({ quantity, status });
  if (note) params.append('note', note);
  const response = await axiosClient.put(`/room-assets/${id}?${params.toString()}`);
  return response;
};

export const deleteRoomAsset = async (id) => {
  const response = await axiosClient.delete(`/room-assets/${id}`);
  return response;
};

// Lấy RoomAsset theo roomNumber (chuỗi)
export const getAssetsByRoomNumber = async (roomNumber) => {
  const response = await axiosClient.get(`/room-assets/by-room-number?roomNumber=${roomNumber}`);
  return response;
};

// Lấy tổng số asset và phân loại asset
export const getAssetStats = async () => {
  const res = await getAllAssets(0, 1000);
  const assets = res?.data?.result || [];
  const stats = { total: 0, byType: {} };
  assets.forEach(a => {
    const type = a.assetStatus || "Khác";
    stats.byType[type] = (stats.byType[type] || 0) + 1;
    stats.total++;
  });
  return stats;
};

export const checkDuplicateAssetName = async (assetName, excludeId = null) => {
  let url = `/assets/check-duplicate?assetName=${encodeURIComponent(assetName)}`;
  if (excludeId) {
    url += `&excludeId=${excludeId}`;
  }
  const response = await axiosClient.get(url);
  return response.data.isDuplicate;
};
