import axios from "axios";

// 👉 Chọn BASE_URL theo runtime để tránh mixed-content khi chạy HTTPS
const isBrowser = typeof window !== "undefined";
const currentOrigin = isBrowser ? window.location.origin : "";
const isProdDomain = isBrowser && /mpbhms\.online$/i.test(window.location.hostname);

// Ưu tiên domain hiện tại khi ở production (HTTPS), fallback sang biến môi trường khi dev
export const BACKEND_URL = isProdDomain
  ? currentOrigin
  : (import.meta.env.VITE_BACKEND_URL || "http://localhost:8080");

const BASE_URL = `${BACKEND_URL}/mpbhms/`;
const REFRESH_URL = `${BACKEND_URL}/mpbhms/auth/refresh`;

console.log("✅ Backend URL:", BACKEND_URL);

const axiosClient = axios.create({
  baseURL: BASE_URL,
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
  (response) => {
    if (response.config.responseType === "blob") {
      return response;
    }
    return response.data;
  },
  async (error) => {
    const originalRequest = error.config;

    const is401 = error.response?.status === 401;
    const isNotRefresh = !originalRequest.url.includes("/auth/refresh");
    const isNotRetried = !originalRequest._retry;


    // ✅ Thêm kiểm tra nếu đang ở trang /login
    const currentPath = window.location.pathname;
    const isLoginPage = currentPath === "/login";
    if (is401 && isNotRefresh && isNotRetried && !isLoginPage) {
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
