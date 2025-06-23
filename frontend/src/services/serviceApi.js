import axiosClient from "./axiosClient";

export const getAllServices = async (page = 0, size = 10, filters = {}) => {
  // Use axios's 'params' object for robust serialization
  const params = {
    page,
    size,
    sortDir: 'desc',
    ...filters
  };

  // Remove null, undefined, or empty string keys from params before sending
  Object.keys(params).forEach(key => {
    if (params[key] == null || params[key] === '') {
      delete params[key];
    }
  });

  const response = await axiosClient.get("/services", { params });
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