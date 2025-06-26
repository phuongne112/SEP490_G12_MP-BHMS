import axiosClient from "./axiosClient";

export const getAllAssets = async (page = 0, size = 10, filters = {}) => {
  let url = `/assets?page=${page}&size=${size}`;
  let filterDsl = "";
  if (typeof filters === 'object' && filters !== null) {
    const dslArr = [];
    if (filters.assetName) dslArr.push(`assetName~'${filters.assetName}'`);
    if (filters.assetStatus) dslArr.push(`assetStatus='${filters.assetStatus}'`);
    filterDsl = dslArr.join(" and ");
  } else if (typeof filters === 'string') {
    filterDsl = filters;
  }
  if (filterDsl) {
    url += `&filter=${encodeURIComponent(filterDsl)}`;
  }
  console.log("[getAllAssets] url:", url, "filters:", filters, "filterDsl:", filterDsl);
  const response = await axiosClient.get(url);
  return response;
};

export const addAsset = async (formData) => {
  const response = await axiosClient.post("/assets", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response;
}; 