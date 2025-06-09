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

  useEffect(() => {
    const checkToken = async () => {
      if (hasLoggedOut.current) return;
      try {
        await axiosClient.get("/auth/account");
        console.log("✅ Token hợp lệ");
      } catch (err) {
        console.warn("❌ Token lỗi hoặc hết hạn");
      }
    };

    checkToken(); // 👈 Gọi ngay khi load trang
    const interval = setInterval(checkToken, 65000); // 👈 Gọi lại mỗi 65s

    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <AppRouter />
    </>
  );
}

export default App;
