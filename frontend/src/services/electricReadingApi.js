import axiosClient from "./axiosClient";

// Truyền params: { serviceId, startDate, endDate } nếu filter theo khoảng ngày
export const getElectricReadings = (params) =>
  axiosClient.get("/services/readings", { params }); 