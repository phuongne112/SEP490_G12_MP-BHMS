import React, { useEffect, useState } from "react";
import logo from "../../assets/logo.png";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { logout } from "../../store/accountSlice";
import { Dropdown, Menu, Avatar } from "antd";
import { UserOutlined } from "@ant-design/icons";

export default function Header() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [user, setUser] = useState(
    JSON.parse(localStorage.getItem("user") || "null")
  );

  const handleLogout = () => {
    navigate("/login", { replace: true });
    dispatch(logout());
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.dispatchEvent(new Event("token-changed"));
  };

  useEffect(() => {
    const handleStorageChange = () => {
      setToken(localStorage.getItem("token"));
      setUser(JSON.parse(localStorage.getItem("user") || "null"));
    };
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("token-changed", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("token-changed", handleStorageChange);
    };
  }, []);

  return (
    <header
      style={{
        backgroundColor: "#0f172a", // slate-900
        color: "#fff",
        padding: "14px 32px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        position: "sticky",
        top: 0,
        zIndex: 1000,
      }}
    >
      {/* Logo */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          cursor: "pointer",
        }}
        onClick={() => navigate("/")}
      >
        <img src={logo} alt="Logo" style={{ height: 40 }} />
        <h2 style={{ margin: 0, fontSize: 20 }}>MinhPhuong</h2>
      </div>

      {/* Navigation Links */}
      <nav style={{ display: "flex", gap: 24 }}>
        {["Products", "Solutions", "Community", "Contact", "About"].map(
          (label, idx) => (
            <span
              key={idx}
              style={{
                color: "#cbd5e1", // slate-300
                fontSize: 15,
                cursor: "pointer",
                transition: "color 0.2s",
              }}
              onMouseOver={(e) => (e.target.style.color = "#fff")}
              onMouseOut={(e) => (e.target.style.color = "#cbd5e1")}
            >
              {label}
            </span>
          )
        )}
      </nav>

      {/* User Action */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {token && user ? (
            <Dropdown
          overlay={
            <Menu onClick={({ key }) => {
              if (key === "account") navigate("/account");
              else if (key === "profile") navigate("/profile");
              else if (key === "logout") handleLogout();
            }}>
              <Menu.Item key="account">Thông tin tài khoản</Menu.Item>
              <Menu.Item key="profile">Thông tin cá nhân</Menu.Item>
              <Menu.Divider />
              <Menu.Item key="logout" danger>Đăng xuất</Menu.Item>
            </Menu>
          }
          trigger={["click"]}
          placement="bottomRight"
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              cursor: "pointer",
            }}
          >
            <Avatar
              icon={<UserOutlined />}
              style={{
                backgroundColor: "#6d28d9",
              }}
            />
            <span
              style={{
                color: "#e2e8f0",
                fontSize: 15,
                fontWeight: 500,
                maxWidth: 120,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {user?.name || "No name"}
            </span>
          </div>
        </Dropdown>

        ) : (
          <>
            <button
              onClick={() => navigate("/login")}
              style={{
                padding: "6px 14px",
                backgroundColor: "#e2e8f0",
                color: "#1e293b",
                border: "none",
                borderRadius: 8,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Sign in
            </button>
            <button
              onClick={() => navigate("/signup")}
              style={{
                padding: "6px 14px",
                backgroundColor: "#1e40af",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Register
            </button>
          </>
        )}
      </div>
    </header>
  );
}
