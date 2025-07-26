import axiosClient from "./axiosClient";

export const getAllServices = async (page = 0, size = 10, filters = {}) => {
  let url = `/services?page=${page}&size=${size}`;
  let filterDsl = "";
  if (typeof filters === 'object' && filters !== null) {
    const dslArr = [];
    if (filters.serviceName) dslArr.push(`serviceName~'${filters.serviceName}'`);
    if (filters.serviceType) dslArr.push(`serviceType='${filters.serviceType}'`);
    if (filters.minPrice) dslArr.push(`unitPrice>=${filters.minPrice}`);
    if (filters.maxPrice) dslArr.push(`unitPrice<=${filters.maxPrice}`);
    filterDsl = dslArr.join(" and ");
  } else if (typeof filters === 'string') {
    filterDsl = filters;
  }
  if (filterDsl) {
    url += `&filter=${encodeURIComponent(filterDsl)}`;
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

// Thêm các API mới cho quản lý lịch sử giá
export const updateServicePrice = async (serviceId, priceData) => {
  const response = await axiosClient.put(`/services/${serviceId}/price`, priceData);
  return response;
};

export const getServicePriceHistory = async (serviceId) => {
  const response = await axiosClient.get(`/services/${serviceId}/price-history`);
  return response;
};

export const getServicePriceAtDate = async (serviceId, date) => {
  const response = await axiosClient.get(`/services/${serviceId}/price-at-date?date=${date}`);
  return response;
};

export const deleteServicePriceHistory = async (historyId) => {
  const response = await axiosClient.delete(`/services/price-history/${historyId}`);
  return response;
}; 