import axiosClient from "./axiosClient";

export const getAllContracts = async ({ page = 0, size = 500, filter = "", sort = "" } = {}) => {
  let url = `/contracts?page=${page}&size=${size}`;
  if (filter && filter.trim()) {
    url += `&filter=${encodeURIComponent(filter)}`;
  }
  if (sort && sort.trim()) {
    url += `&sort=${encodeURIComponent(sort)}`;
  }
  const response = await axiosClient.get(url);
  return response.data;
};

export const exportContractPdf = async (id) => {
  const response = await axiosClient.get(`/contracts/${id}/export`, {
    responseType: "blob",
  });
  return response.data;
};

export const createContract = async (data) => {
  const response = await axiosClient.post("/contracts", data);
  return response.data;
};

export const updateContract = async (data) => {
  const response = await axiosClient.put("/contracts", data);
  return response.data;
};

export const deleteContract = async (id) => {
  const response = await axiosClient.delete(`/contracts/${id}`);
  return response.data;
};

export const getRenterContracts = () => {
  return axiosClient.get('/contracts/my-contracts');
};

export const getContractAmendments = async (contractId) => {
  const response = await axiosClient.get(`/room-users/contract-amendments/${contractId}`);
  return response.data;
};

export const getContractHistoryByRoom = async (roomId) => {
  const response = await axiosClient.get(`/contracts/room/${roomId}/history`);
  return response.data;
};

export const buildContractFilterString = (params = {}) => {
  const filters = [];
  
  // Validate and add filters, bỏ qua 'ALL', null, undefined
  if (params.contractStatus && params.contractStatus !== "ALL" && params.contractStatus.trim()) {
    filters.push(`contractStatus='${params.contractStatus}'`);
  }
  if (params.paymentCycle && params.paymentCycle !== "ALL" && params.paymentCycle.trim()) {
    filters.push(`paymentCycle='${params.paymentCycle}'`);
  }
  if (params.roomId && params.roomId !== "ALL") {
    filters.push(`room.id~${params.roomId}`);
  }
  if (params.contractStartDateFrom && params.contractStartDateFrom.trim()) {
    filters.push(`contractStartDate>='${params.contractStartDateFrom}'`);
  }
  if (params.contractStartDateTo && params.contractStartDateTo.trim()) {
    filters.push(`contractStartDate<='${params.contractStartDateTo}'`);
  }
  if (params.depositAmountFrom !== undefined && params.depositAmountFrom !== null) {
    filters.push(`depositAmount>=${params.depositAmountFrom}`);
  }
  if (params.depositAmountTo !== undefined && params.depositAmountTo !== null) {
    filters.push(`depositAmount<=${params.depositAmountTo}`);
  }
  if (params.rentAmountFrom !== undefined && params.rentAmountFrom !== null) {
    filters.push(`rentAmount>=${params.rentAmountFrom}`);
  }
  if (params.rentAmountTo !== undefined && params.rentAmountTo !== null) {
    filters.push(`rentAmount<=${params.rentAmountTo}`);
  }
  
  const filterString = filters.join(" and ");
  // Chỉ trả về filter string nếu có ít nhất 1 filter, nếu không trả về null
  return filterString.trim() ? filterString : null;
};
