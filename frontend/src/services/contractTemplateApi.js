import axiosClient from './axiosClient';

export const getTemplates = (landlordId) =>
  axiosClient.get(`/contract-templates?landlordId=${landlordId}`);

export const getTemplateById = (id) =>
  axiosClient.get(`/contract-templates/${id}`);

export const createOrUpdateTemplate = (data) =>
  axiosClient.post('/contract-templates', data);

export const deleteTemplate = (id) =>
  axiosClient.delete(`/contract-templates/${id}`);

export const setDefaultTemplate = (id, landlordId) =>
  axiosClient.post(`/contract-templates/${id}/set-default?landlordId=${landlordId}`); 