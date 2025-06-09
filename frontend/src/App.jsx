import React, { useEffect, useRef } from "react";
import AppRouter from "./routes/Router";
import { useNavigate } from "react-router-dom";
import axiosClient from "./services/axiosClient";

function App() {
  const navigate = useNavigate();
  const hasLoggedOut = useRef(false);

  useEffect(() => {
    const handleForceLogout = () => {
      hasLoggedOut.current = true;
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("showWelcome");
      navigate("/login");
    };

    window.addEventListener("force-logout", handleForceLogout);

    return () => {
      window.removeEventListener("force-logout", handleForceLogout);
    };
  }, [navigate]);

  // useEffect(() => {
  //   const checkToken = async () => {
  //     if (hasLoggedOut.current) return;
  //     try {
  //       await axiosClient.get("/auth/account"); // Xác thực xem token hợp lệ ko
  //       console.log("✅ Token hợp lệ");
  //     } catch (err) {
  //       console.warn("❌ Token lỗi hoặc hết hạn");
  //     }
  //   };

  //   checkToken(); // 👈 Gọi ngay khi load trang
  //   const interval = setInterval(checkToken, 65000); // 👈 Gọi lại mỗi 65s

  //   return () => clearInterval(interval);
  // }, []);

  // useEffect(() => {
  //   const checkToken = async () => {
  //     if (hasLoggedOut.current) return;

  //     const token = localStorage.getItem("token");
  //     if (!token) return; // ⛔ Không gọi nếu chưa đăng nhập

  //     try {
  //       await axiosClient.get("/auth/account");
  //       console.log("✅ Token hợp lệ");
  //     } catch (err) {
  //       console.warn("❌ Token lỗi hoặc hết hạn");
  //     }
  //   };

  //   checkToken();
  //   const interval = setInterval(checkToken, 65000);
  //   return () => clearInterval(interval);
  // }, []);

  useEffect(() => {
    const checkToken = async () => {
      if (hasLoggedOut.current) return;

      const token = localStorage.getItem("token");
      const hasUser = localStorage.getItem("user");

      // ⛔ Nếu chưa login → không gọi gì cả
      if (!token && !hasUser) return;

      // ✅ Nếu không có accessToken nhưng đã login → thử refresh
      if (!token && hasUser) {
        try {
          const res = await axiosClient.get("/auth/refresh", {
            withCredentials: true,
          });
          const newToken = res.data?.data?.access_token;
          if (newToken) {
            localStorage.setItem("token", newToken);
            console.log("🔁 Đã refresh lại token thành công");
          }
        } catch (err) {
          console.warn("❌ Refresh token hết hạn hoặc sai → logout");
          localStorage.removeItem("user");
          window.dispatchEvent(new Event("force-logout"));
        }
        return;
      }

      // ✅ Có accessToken → kiểm tra bình thường
      try {
        await axiosClient.get("/auth/account");
        console.log("✅ Token hợp lệ");
      } catch (err) {
        console.warn("❌ Token lỗi hoặc hết hạn");
      }
    };

    checkToken();
    const interval = setInterval(checkToken, 65000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <AppRouter />
    </>
  );
}

export default App;
