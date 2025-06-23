import axiosClient from "./axiosClient";

export const getAllRenters = async (page = 0, size = 10, filter = {}) => {
  const params = { page, size, ...filter };
  const res = await axiosClient.get("/renters", { params });
  return res.data;
};

// New function for getting renters with filter string for assign page
export const getRentersForAssign = (page = 0, size = 100, filter = "") => {
  let url = `/renters?page=${page}&size=${size}`;
  if (filter) url += `&filter=${encodeURIComponent(filter)}`;
  return axiosClient.get(url);
};
