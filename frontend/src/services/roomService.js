import axiosClient from "./axiosClient";

/**
 * Lấy danh sách phòng với phân trang và filter DSL.
 * @param {number} page - Số trang (bắt đầu từ 0).
 * @param {number} size - Kích thước trang.
 * @param {string} filter - Chuỗi filter DSL.
 */
export const getAllRooms = async (page = 0, size = 20, filter = "") => {
  let url = `rooms?page=${page}&size=${size}`;

  if (filter && filter.trim() !== "") {
    const encodedFilter = encodeURIComponent(filter.trim());
    url += `&filter=${encodedFilter}`;
  }

  console.log("[GET]", url); // Debug
  const response = await axiosClient.get(url);
  return response.data;
};
