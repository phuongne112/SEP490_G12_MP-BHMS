import axiosClient from "./axiosClient";

// Truyền params: { serviceId, startDate, endDate } nếu filter theo khoảng ngày
export const getElectricReadings = (params) =>
  axiosClient.get("/services/readings", { params }); 

export const enableAutoScan = () => axiosClient.post("/ocr/auto-scan/on");
export const disableAutoScan = () => axiosClient.post("/ocr/auto-scan/off");
export const getAutoScanStatus = () => axiosClient.get("/ocr/auto-scan/status");
export const getScanLogs = (params) => axiosClient.get("/ocr/scan-logs", { params });
export const getScanImages = () => axiosClient.get("/ocr/scan-images");
export const getCurrentScanningImage = () => axiosClient.get("/ocr/current-scanning-image"); 