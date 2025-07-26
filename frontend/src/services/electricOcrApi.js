import axiosClient from "./axiosClient";

export const detectElectricOcr = (file) => {
  const formData = new FormData();
  formData.append("file", file);
  return axiosClient.post("/ocr/detect-ocr", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export const detectAndSaveElectricOcr = (file, roomId) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("roomId", roomId);
  return axiosClient.post("/ocr/detect-and-save", formData, {
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

// Auto Capture APIs
export const enableAutoCapture = () => {
  return axiosClient.post("/ocr/auto-capture/on");
};

export const disableAutoCapture = () => {
  return axiosClient.post("/ocr/auto-capture/off");
};

export const getAutoCaptureStatus = () => {
  return axiosClient.get("/ocr/auto-capture/status");
};

export const getAutoCaptureInterval = () => {
  return axiosClient.get("/ocr/auto-capture/interval");
};

export const setAutoCaptureInterval = (intervalMs) => {
  return axiosClient.post("/ocr/auto-capture/interval", { intervalMs });
};

export const getTargetRoom = () => {
  return axiosClient.get("/ocr/auto-capture/room");
};

export const setTargetRoom = (roomNumber) => {
  return axiosClient.post("/ocr/auto-capture/room", { roomNumber });
};

export const getAutoCaptureInfo = () => {
  return axiosClient.get("/ocr/auto-capture/info");
}; 