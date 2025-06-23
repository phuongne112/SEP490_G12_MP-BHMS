import axiosClient from "./axiosClient";

const contractApi = {
  getAll: () => axiosClient.get("/mpbhms/contracts"),
  exportPdf: (id) =>
    axiosClient.get(`/mpbhms/contracts/${id}/export`, {
      responseType: "blob",
    }),
};
export default contractApi;
