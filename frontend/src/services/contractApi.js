import axiosClient from "./axiosClient";

export const getAllContracts = async (params = {}) => {
  const response = await axiosClient.get("/contracts", { params });
  return response.data;
};

export const exportContractPdf = async (id) => {
  const response = await axiosClient.get(`/contracts/${id}/export`, {
    responseType: "blob",
  });
  return response.data;
};

export const createContract = async (data) => {
  const response = await axiosClient.post("/contracts", data);
  return response.data;
};

export const updateContract = async (data) => {
  const response = await axiosClient.put("/contracts", data);
  return response.data;
};

export const deleteContract = async (id) => {
  const response = await axiosClient.delete(`/contracts/${id}`);
  return response.data;
};
