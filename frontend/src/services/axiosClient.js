import axios from "axios";

const axiosClient = axios.create({
  baseURL: "http://localhost:8080/mpbhms/",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // để gửi cookie(refreshToken)
});

// Request interceptor: gắn accessToken
axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    const publicEndpoints = ["/auth/login", "/auth/register", "/auth/refresh"];
    if (
      token &&
      !publicEndpoints.some((endpoint) => config.url.includes(endpoint))
    ) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor: xử lý lỗi 401 → gọi refresh → retry lại request
axiosClient.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config;

    // ✅ Luôn cho phép retry nếu là lỗi 401, chưa retry và không phải chính refresh
    const is401 = error.response?.status === 401; // Bị lỗi 401
    const isNotRefresh = !originalRequest.url.includes("/auth/refresh"); // request lỗi có phải là /auth/refresh không
    const isNotRetried = !originalRequest._retry; //request này chưa từng được retry bằng access token mới

    if (is401 && isNotRefresh && isNotRetried) {
      originalRequest._retry = true;

      try {
        // ✅ gọi refresh dù token không có
        const res = await axios.get(
          "http://localhost:8080/mpbhms/auth/refresh",
          {
            withCredentials: true, // ⬅️ bắt buộc để gửi cookie refresh
          }
        );

        const newToken = res.data?.data?.access_token;
        if (!newToken) throw new Error("Không có token mới từ /auth/refresh");

        // ✅ Lưu và kích hoạt App.jsx
        localStorage.setItem("token", newToken);
        window.dispatchEvent(new Event("token-changed"));

        // ✅ Retry request cũ với token mới
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
