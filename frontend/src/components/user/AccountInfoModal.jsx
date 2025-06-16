import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { logout } from "../../store/accountSlice";
import logo from "../../assets/logo.png";
import {
  Dropdown,
  Menu,
  Avatar,
  message,
  Typography,
} from "antd";
import { UserOutlined } from "@ant-design/icons";
import AccountInfoModal from "../../components/user/AccountInfoModal";
import PersonalInfoModal from "../../components/user/PersonalInfoModal";
import { getAccountInfo, getPersonalInfo } from "../../services/userApi";

const { Title } = Typography;

export default function Header() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [user, setUser] = useState(
    JSON.parse(localStorage.getItem("user") || "null")
  );

  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [accountData, setAccountData] = useState(null);
  const [infoData, setInfoData] = useState(null);

  const handleLogout = () => {
    navigate("/login", { replace: true });
    dispatch(logout());
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.dispatchEvent(new Event("token-changed"));
  };

  const openAccountModal = async () => {
    try {
      const res = await getAccountInfo();
      setAccountData(res);
      setIsAccountModalOpen(true);
    } catch {
      message.error("Không thể tải thông tin tài khoản");
    }
  };

  const openInfoModal = async () => {
    try {
      const res = await getPersonalInfo();
      setInfoData(res);
      setIsInfoModalOpen(true);
    } catch {
      message.error("Không thể tải thông tin cá nhân");
    }
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
        backgroundColor: "#0f172a",
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
      <div
        style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}
        onClick={() => navigate("/")}
      >
        <img src={logo} alt="Logo" style={{ height: 40 }} />
        <Title level={3} style={{ margin: 0, color: "#fff" }}>MinhPhuong</Title>
      </div>

      <nav style={{ display: "flex", gap: 24 }}>
        {["Products", "Solutions", "Community", "Contact", "About"].map(
          (label, idx) => (
            <span
              key={idx}
              style={{ color: "#cbd5e1", fontSize: 15, cursor: "pointer" }}
              onMouseOver={(e) => (e.target.style.color = "#fff")}
              onMouseOut={(e) => (e.target.style.color = "#cbd5e1")}
            >
              {label}
            </span>
          )
        )}
      </nav>

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {token && user ? (
          <>
            <Dropdown
              overlay={
                <Menu>
                  <Menu.Item onClick={openAccountModal}>
                    Thông tin tài khoản
                  </Menu.Item>
                  <Menu.Item onClick={openInfoModal}>
                    Thông tin cá nhân
                  </Menu.Item>
                  <Menu.Divider />
                  <Menu.Item onClick={handleLogout} danger>
                    Đăng xuất
                  </Menu.Item>
                </Menu>
              }
              trigger={["click"]}
              placement="bottomRight"
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <Avatar icon={<UserOutlined />} style={{ backgroundColor: "#6d28d9" }} />
                <span style={{ color: "#e2e8f0", fontSize: 15, fontWeight: 500 }}>
                  {user?.name || "No name"}
                </span>
              </div>
            </Dropdown>

            <AccountInfoModal
              open={isAccountModalOpen}
              onClose={() => setIsAccountModalOpen(false)}
              initialData={accountData}
            />
            <PersonalInfoModal
              open={isInfoModalOpen}
              onClose={() => setIsInfoModalOpen(false)}
              initialData={infoData}
            />
          </>
        ) : (
          <>
            <button onClick={() => navigate("/login")} style={{ padding: "6px 14px", backgroundColor: "#e2e8f0", color: "#1e293b", border: "none", borderRadius: 8, fontWeight: 500, cursor: "pointer" }}>Sign in</button>
            <button onClick={() => navigate("/signup")} style={{ padding: "6px 14px", backgroundColor: "#1e40af", color: "#fff", border: "none", borderRadius: 8, fontWeight: 500, cursor: "pointer" }}>Register</button>
          </>
        )}
      </div>
    </header>
  );
}
