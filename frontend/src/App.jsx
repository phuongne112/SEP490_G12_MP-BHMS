import React, { useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useDispatch } from "react-redux";

import AppRouter from "./routes/Router";
import axiosClient from "./services/axiosClient";
import { getCurrentUser } from "./services/authService";
import { setUser } from "./store/accountSlice";

function App() {
  const navigate = useNavigate();
  const location = useLocation(); // ✅ lắng nghe route
  const dispatch = useDispatch();
  const hasLoggedOut = useRef(false);

  // ✅ Force logout khi hết hạn refreshToken
  useEffect(() => {
    const handleForceLogout = () => {
      hasLoggedOut.current = true;
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("showWelcome");
      // Chỉ redirect về login nếu không phải đang ở trang public
      const publicPaths = ["/home", "/rooms", "/forgotPassword", "/resetPassword"];
      if (!publicPaths.some((p) => location.pathname.startsWith(p))) {
        navigate("/login");
      }
    };

    window.addEventListener("force-logout", handleForceLogout);
    return () => window.removeEventListener("force-logout", handleForceLogout);
  }, [navigate, location.pathname]);

  // ✅ Kiểm tra token định kỳ và refresh nếu cần
  useEffect(() => {
    const checkToken = async () => {
      if (hasLoggedOut.current) return;

      const token = localStorage.getItem("token");
      const hasUser = localStorage.getItem("user");

      if (!token && !hasUser) return;

      if (!token && hasUser) {
        try {
          const res = await axiosClient.get("/auth/refresh", {
            withCredentials: true,
          });
          const newToken = res.data?.data?.access_token;
          if (newToken) {
            localStorage.setItem("token", newToken);
            console.log("Token has been refreshed successfully.");
          }
        } catch (err) {
          console.warn("Refresh token expired or invalid → logout");
          localStorage.removeItem("user");
          window.dispatchEvent(new Event("force-logout"));
        }
        return;
      }

      try {
        await axiosClient.get("/auth/account");
        console.log("Token is valid.");
      } catch (err) {
        console.warn("Token is invalid or expired.");
      }
    };

    checkToken();
    const interval = setInterval(checkToken, 65000);
    return () => clearInterval(interval);
  }, []);

  // ✅ Tự động lấy lại thông tin user khi chuyển trang (để cập nhật quyền)
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await getCurrentUser();
        dispatch(
          setUser({
            id: user.id,
            fullName: user.fullName || user.name,
            email: user.email,
            role: user.role,
            permissions:
              user.role?.permissionEntities?.map((p) => p.name) || [],
          })
        );
      } catch (err) {
        console.warn("Cannot update the information user");
      }
    };

    fetchUser();
  }, [location.pathname]); // 🔁 Gọi lại mỗi lần chuyển route

  return <AppRouter />;
}

export default App;