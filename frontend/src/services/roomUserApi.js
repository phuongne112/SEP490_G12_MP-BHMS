import axiosClient from "./axiosClient";

export const renewContract = (contractId, newEndDate) => {
  return axiosClient.post(`/room-users/renew-contract/${contractId}`, { newEndDate });
};

export const terminateContract = (contractId) => {
  return axiosClient.post(`/room-users/terminate-contract/${contractId}`);
};

export const updateContract = (data) => {
  return axiosClient.post(`/room-users/update-contract`, data);
};

export const getContractAmendments = (contractId) => {
  return axiosClient.get(`/room-users/contract-amendments/${contractId}`);
};

export const processExpiredContracts = () => {
  return axiosClient.post(`/room-users/process-expired-contracts`);
};

export const approveAmendment = (amendmentId, isLandlordApproval) => {
  return axiosClient.post(`/room-users/approve-amendment/${amendmentId}`, {
    isLandlordApproval
  });
};

export const rejectAmendment = (amendmentId, reason) => {
  return axiosClient.post(`/room-users/reject-amendment/${amendmentId}`, {
    reason
  });
};

export const requestTerminateContract = (contractId, reason) => {
  return axiosClient.post(`/room-users/request-terminate-contract/${contractId}`, { reason });
}; 