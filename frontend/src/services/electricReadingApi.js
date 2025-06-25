import axiosClient from "./axiosClient";

export const getElectricReadings = () =>
  axiosClient.get("/services/readings?serviceId=1"); 