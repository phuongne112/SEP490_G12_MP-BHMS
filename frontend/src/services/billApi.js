import axiosClient from "./axiosClient";

export const getAllBills = async (params = {}) => {
  // params: { page, size, roomId, status, minPrice, maxPrice, search, ... }
  let url = "/bills?";
  const query = Object.entries(params)
    .filter(([_, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
  url += query;
  const response = await axiosClient.get(url);
  return response.data;
};

export const getBillDetail = async (id) => {
  const response = await axiosClient.get(`bills/${id}`);
  return response.data;
};

export const createBill = async (data) => {
  return axiosClient.post("bills", data);
};

export const deleteBill = async (id) => {
  return axiosClient.delete(`bills/${id}`);
};

export const exportBillPdf = async (id) => {
  return axiosClient.get(`bills/${id}/export`, { responseType: "blob" });
};

export const sendBillToRenter = async (id) => {
  return axiosClient.post(`bills/${id}/send`);
}; 