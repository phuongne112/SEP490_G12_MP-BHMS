import axiosClient from "./axiosClient";

export const getLandlordBookingList = async (landlordId, { page = 1, size = 5, email = '', fullName = '' } = {}) => {
  const params = {
    landlordId,
    page: page - 1, // backend thường dùng page bắt đầu từ 0
    size,
  };
  if (email) params.email = email;
  if (fullName) params.fullName = fullName;
  const response = await axiosClient.get(`/schedules/landlord`, { params });
  return response.data;
};

export const getAllBookings = async () => {
  const response = await axiosClient.get(`/schedules`);
  return response.data;
}; 