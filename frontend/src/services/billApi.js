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

// Thống kê hóa đơn cho dashboard
export const getBillStats = async () => {
  const response = await axiosClient.get("/bills/dashboard-stats");
  return response.data;
};

// Tạo hóa đơn tự động hàng loạt cho tất cả phòng
export const bulkGenerateBills = async () => {
  const response = await axiosClient.post("/bills/bulk-generate");
  return response.data;
};

// Cập nhật trạng thái thanh toán hóa đơn
export const updateBillPaymentStatus = async (id, status) => {
  const response = await axiosClient.put(`/bills/${id}/payment-status`, { status });
  return response.data;
};

// Tạo hóa đơn phạt quá hạn
export const createLatePenaltyBill = async (billId) => {
  const response = await axiosClient.post(`/bills/${billId}/create-penalty`);
  return response.data;
};

// Kiểm tra và tạo phạt quá hạn tự động
export const checkAndCreateLatePenalties = async () => {
  const response = await axiosClient.post("/bills/check-and-create-penalties");
  return response.data;
};

// Chạy thủ công job kiểm tra phạt quá hạn
export const runLatePenaltyCheck = async () => {
  const response = await axiosClient.post("/bills/run-late-penalty-check");
  return response.data;
};

// Lấy danh sách hóa đơn quá hạn
export const getOverdueBills = async () => {
  const response = await axiosClient.get("/bills/overdue-bills");
  return response.data;
};

// Thanh toán từng phần
export const makePartialPayment = async (request) => {
  try {
    const response = await axiosClient.post('/bills/partial-payment', request);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Tạo QR VNPAY cho thanh toán từng phần
export const createPartialPaymentVnPayUrl = async (request) => {
  try {
    const response = await axiosClient.post('/bills/partial-payment/vnpay', request);
    return response.data;
  } catch (error) {
    throw error;
  }
}; 