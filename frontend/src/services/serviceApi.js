import axiosClient from "./axiosClient";

export const getAllServices = async (page = 0, size = 10, serviceName = "", serviceType = "") => {
  let url = `/services?page=${page}&size=${size}`;
  if (serviceName) {
    url += `&serviceName=${encodeURIComponent(serviceName)}`;
  }
  if (serviceType) {
    url += `&serviceType=${encodeURIComponent(serviceType)}`;
  }
  const response = await axiosClient.get(url);
  return response;
};

export const getAllServicesList = async () => {
  const response = await axiosClient.get("/services/all");
  return response;
};

export const getServiceById = async (id) => {
  const response = await axiosClient.get(`/services/${id}`);
  return response;
};

export const createService = async (serviceData) => {
  const response = await axiosClient.post("/services", serviceData);
  return response;
};

export const updateService = async (id, serviceData) => {
  const response = await axiosClient.put(`/services/${id}`, serviceData);
  return response;
};

export const deleteService = async (id) => {
  const response = await axiosClient.delete(`/services/${id}`);
  return response;
}; 