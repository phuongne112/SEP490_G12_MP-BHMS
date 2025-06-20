import axiosClient from "./axiosClient";

export const getAllRenters = async (page = 0, size = 10, filter = {}) => {
  const params = { page, size, ...filter };
  const res = await axiosClient.get("/renters", { params });
  return res.data;
};
