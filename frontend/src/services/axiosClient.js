import axios from "axios";

// 👉 Lấy biến môi trường từ file .env
const BASE_URL = `${import.meta.env.VITE_BACKEND_URL}/mpbhms/`;
console.log("✅ Backend URL:", import.meta.env.VITE_BACKEND_URL);

const REFRESH_URL = `${import.meta.env.VITE_BACKEND_URL}/mpbhms/auth/refresh`;

const axiosClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // ⬅️ gửi cookie (refreshToken)
});

// ✅ Request interceptor: gắn accessToken nếu không phải public endpoint
axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");

    const publicEndpoints = [
    ];

    const isPublicAuth = publicEndpoints.some((endpoint) =>
      config.url.includes(endpoint)
    );

    const isPublicRooms =
      config.method === "get" && config.url?.startsWith("/rooms");

    if (!isPublicAuth && !isPublicRooms && token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ✅ Response interceptor: xử lý 401 → gọi refresh → retry
axiosClient.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config;

    const is401 = error.response?.status === 401;
    const isNotRefresh = !originalRequest.url.includes("/auth/refresh");
    const isNotRetried = !originalRequest._retry;

    if (is401 && isNotRefresh && isNotRetried) {
      originalRequest._retry = true;

      try {
        const res = await axios.get(REFRESH_URL, {
          withCredentials: true,
        });

        const newToken = res.data?.data?.access_token;
        if (!newToken) throw new Error("Không có token mới từ /auth/refresh");

        localStorage.setItem("token", newToken);
        window.dispatchEvent(new Event("token-changed"));

        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return axiosClient(originalRequest);
      } catch (refreshErr) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.dispatchEvent(new Event("force-logout"));
        return Promise.reject(refreshErr);
      }
    }

    return Promise.reject(error);
  }
);

export default axiosClient;
