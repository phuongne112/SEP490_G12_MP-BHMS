import axiosClient from './axiosClient';

const paymentHistoryApi = {
    // Lấy lịch sử thanh toán của một hóa đơn
    getPaymentHistoryByBillId: (billId) => {
        return axiosClient.get(`/payment-history/bill/${billId}`);
    },

    // Lấy lịch sử thanh toán của một hóa đơn với phân trang
    getPaymentHistoryByBillIdWithPagination: (billId, page = 0, size = 10) => {
        return axiosClient.get(`/payment-history/bill/${billId}/page`, {
            params: { page, size }
        });
    },

    // Lấy lịch sử thanh toán của một phòng
    getPaymentHistoryByRoomId: (roomId) => {
        return axiosClient.get(`/payment-history/room/${roomId}`);
    },

    // Lấy lịch sử thanh toán của một người dùng
    getPaymentHistoryByUserId: (userId) => {
        return axiosClient.get(`/payment-history/user/${userId}`);
    },

    // Lấy lịch sử thanh toán trong khoảng thời gian
    getPaymentHistoryByDateRange: (startDate, endDate) => {
        return axiosClient.get('/payment-history/date-range', {
            params: { startDate, endDate }
        });
    },

    // Lấy lịch sử thanh toán theo phương thức thanh toán
    getPaymentHistoryByPaymentMethod: (paymentMethod) => {
        return axiosClient.get(`/payment-history/payment-method/${paymentMethod}`);
    },

    // Lấy lịch sử thanh toán từng phần của một hóa đơn
    getPartialPaymentHistoryByBillId: (billId) => {
        return axiosClient.get(`/payment-history/bill/${billId}/partial`);
    },

    // Lấy lần thanh toán cuối cùng của một hóa đơn
    getLatestPaymentByBillId: (billId) => {
        return axiosClient.get(`/payment-history/bill/${billId}/latest`);
    },

    // Lấy thống kê thanh toán của một hóa đơn
    getPaymentStatistics: (billId) => {
        return axiosClient.get(`/payment-history/bill/${billId}/statistics`);
    },

    // Xóa lịch sử thanh toán (chỉ admin)
    deletePaymentHistory: (paymentHistoryId) => {
        return axiosClient.delete(`/payment-history/${paymentHistoryId}`);
    }
};

export default paymentHistoryApi;




