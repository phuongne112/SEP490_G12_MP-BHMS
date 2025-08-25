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
  try {
    const response = await axiosClient.delete(`/bills/${id}`);
    return response.data;
  } catch (error) {
    // 🆕 Xử lý lỗi bảo vệ từ backend
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    }
    throw error;
  }
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
  try {
    const res = await axiosClient.post("/payment/create-vnpay-url", {
      billId,
      amount,
      orderInfo,
    });
    
    console.log('createVnPayUrl success response:', res);
    
    // Xử lý cả 2 trường hợp: axiosClient return data hoặc full response
    const data = res.data || res;
    
    // Kiểm tra nếu response có lỗi
    if (data.success === false) {
      throw new Error(data.message);
    }
    
    return data.paymentUrl || res.paymentUrl;
  } catch (error) {
    // Debug log để hiểu cấu trúc lỗi
    console.error('createVnPayUrl error:', error);
    console.error('error.response:', error.response);
    
    // 🆕 Xử lý lỗi bảo vệ từ backend
    if (error.response) {
      const errorData = error.response.data;
      console.log('Error response data:', errorData);
      
      if (typeof errorData === 'string') {
        throw new Error(errorData);
      } else if (errorData && errorData.message) {
        throw new Error(errorData.message);
      }
    }
    
    // Re-throw lỗi gốc nếu không xử lý được
    throw error;
  }
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

// Tạo hóa đơn dịch vụ tự động cho tất cả phòng
export const autoGenerateServiceBills = async () => {
  const response = await axiosClient.post("/bills/auto-generate-service-bills");
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
    // 🆕 Xử lý lỗi bảo vệ từ backend
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    }
    throw error;
  }
};

// Lấy số lần thanh toán đã thực hiện cho một hóa đơn
export const getPaymentCount = async (billId) => {
  try {
    const response = await axiosClient.get(`/bills/${billId}/payment-count`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Thanh toán từng phần bằng tiền mặt
export const createCashPartialPayment = async (paymentData) => {
  try {
    const response = await axiosClient.post('/bills/cash-partial-payment', paymentData);
    return response.data;
  } catch (error) {
    console.error('Error creating cash partial payment:', error);
    throw error;
  }
};

// Thanh toán toàn phần bằng tiền mặt
export const createCashFullPayment = async (paymentData) => {
  try {
    const response = await axiosClient.post('/bills/cash-full-payment', paymentData);
    return response.data;
  } catch (error) {
    console.error('Error creating cash full payment:', error);
    throw error;
  }
};

// Xác nhận thanh toán tiền mặt (cho landlord)
export const confirmCashPayment = async (billId, paymentHistoryId) => {
  try {
    const response = await axiosClient.post(`/bills/${billId}/confirm-cash-payment/${paymentHistoryId}`);
    return response.data;
  } catch (error) {
    console.error('Error confirming cash payment:', error);
    throw error;
  }
};

// Từ chối thanh toán tiền mặt (cho landlord)
export const rejectCashPayment = async (billId, paymentHistoryId, reason = '') => {
  try {
    const response = await axiosClient.post(`/bills/${billId}/reject-cash-payment/${paymentHistoryId}`, {
      reason
    });
    return response.data;
  } catch (error) {
    console.error('Error rejecting cash payment:', error);
    throw error;
  }
}; 