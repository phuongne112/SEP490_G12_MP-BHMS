import axiosClient from "./axiosClient";

export const getAllRenters = async (page = 0, size = 10, filter = {}) => {
  const params = { page, size, ...filter };
  const res = await axiosClient.get("/renters", { params });
  return res.data;
};

// New function for getting renters with filter string for assign page
export const getRentersForAssign = (keyword = "") => {
  let url = `/renters/for-assign`;
  if (keyword) url += `?keyword=${encodeURIComponent(keyword)}`;
  return axiosClient.get(url);
};

export const createRenter = async (data) => {
  // Đảm bảo gửi đúng object JSON, không ép header nếu axiosClient đã mặc định
  return axiosClient.post("/renters", data);
};

export const getAllRentersForAssignFull = () => {
  return axiosClient.get("/renters/for-assign-full");
};

/**
 * Tạo mới người thuê (renter)
 * @param {object} data - Thông tin người thuê (username, fullName, email, password, phone, dateOfBirth, citizenId, address)
 * @returns {Promise<object>} - Thông tin người thuê vừa tạo
 */
export const addRenter = async (data) => {
  const response = await axiosClient.post("/renters", data);
  return response.data;
};

export const updateRenterStatus = async (id, active) => {
  return axiosClient.put(`/users/${id}/active`, { active });
};
