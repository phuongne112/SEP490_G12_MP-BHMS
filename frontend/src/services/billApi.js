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
  const response = await axiosClient.get(`/bills/${id}`);
  return response.data;
};

export const createBill = async (data) => {
  const response = await axiosClient.post("/bills/create", data);
  return response.data;
};

export const generateBill = async (contractId, fromDate, toDate, billType) => {
  const response = await axiosClient.post("/bills/generate", null, {
    params: { contractId, fromDate, toDate, billType }
  });
  return response.data;
};

export const generateFirstBill = async (contractId) => {
  const response = await axiosClient.post("/bills/generate-first", null, {
    params: { contractId }
  });
  return response.data;
};

export const deleteBill = async (id) => {
  return axiosClient.delete(`/bills/${id}`);
};

export const exportBillPdf = async (id) => {
  const response = await axiosClient.get(`/bills/${id}/export`, { responseType: "blob" });
  return response.data;
};

export const sendBillToRenter = async (id) => {
  return axiosClient.post(`/bills/${id}/send`);
};

export const createCustomBill = async (data) => {
  const response = await axiosClient.post("/bills/custom", data);
  return response.data;
};

export const getMyBills = async () => {
  const response = await axiosClient.get("/bills/my");
  return response.data;
};

export const createVnPayUrl = async ({ billId, amount, orderInfo }) => {
  const res = await axiosClient.post("/payment/create-vnpay-url", {
    billId,
    amount,
    orderInfo,
  });
  return res.data.paymentUrl;
}; 