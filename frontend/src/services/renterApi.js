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
  const res = await axiosClient.post("/renters", data);
  return res.data;
};
