import axiosClient from "./axiosClient";

export const getAllNotifications = async (params) => {
  return axiosClient.get("/notifications/all", { params });
};
export const sendNotification = async (data) => {
  return axiosClient.post("/notifications/send", data);
};
