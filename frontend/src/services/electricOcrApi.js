import axiosClient from "./axiosClient";

export const detectElectricOcr = (file) => {
  const formData = new FormData();
  formData.append("file", file);
  return axiosClient.post("/ocr/detect-ocr", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export const saveElectricReading = (roomId, value) => {
  const formData = new FormData();
  formData.append("roomId", roomId);
  formData.append("value", value);
  return axiosClient.post("/ocr/save-reading", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export const getElectricScanInterval = () => {
  return axiosClient.get("/ocr/auto-scan/interval");
}; 