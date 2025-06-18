import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { logout } from "../../store/accountSlice";
import logo from "../../assets/logo.png";
import { Dropdown, Menu, Avatar, Typography, Button, Drawer } from "antd";
import { MenuOutlined, UserOutlined } from "@ant-design/icons";
import AccountModal from "../account/AccountModal";
import UserInfoModal from "../account/UserInfoModal";
import UpdateUserInfoModal from "../account/UpdateUserInfoPage";

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
  const [showUpdateInfoModal, setShowUpdateInfoModal] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [isCreate, setIsCreate] = useState(false);

  // ✅ Hàm xác định dashboard path theo role
  const getDashboardPath = () => {
    const role = user?.role?.roleName || user?.role;
    switch (role) {
      case "ADMIN":
      case "SUBADMIN":
        return "/admin/users";
      case "LANDLORD":
        return "/landlord/dashboard";
      case "RENTER":
        return "/renter/dashboard";
      default:
        return null;
    }
  };
  const dashboardPath = getDashboardPath();

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

  const navItems = ["Products", "Solutions", "Community", "Contact", "About"];

  return (
    <header
      style={{
        backgroundColor: "#0f172a",
        color: "#fff",
        padding: "14px 24px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 12,
        position: "sticky",
        top: 0,
        zIndex: 1000,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          cursor: "pointer",
        }}
        onClick={() => navigate("/home")}
      >
        <img src={logo} alt="Logo" style={{ height: 40 }} />
        <Title
          level={4}
          style={{ margin: 0, color: "#fff", whiteSpace: "nowrap" }}
        >
          MinhPhuong
        </Title>
      </div>

      <div className="desktop-nav" style={{ display: "flex", gap: 24 }}>
        {navItems.map((label, idx) => (
          <span
            key={idx}
            style={{ color: "#cbd5e1", fontSize: 15, cursor: "pointer" }}
            onMouseOver={(e) => (e.target.style.color = "#fff")}
            onMouseOut={(e) => (e.target.style.color = "#cbd5e1")}
          >
            {label}
          </span>
        ))}
      </div>

      <div
        className="auth-buttons"
        style={{ display: "flex", alignItems: "center", gap: 12 }}
      >
        {token && user ? (
          <>
            <Dropdown
              overlay={
                <Menu>
                  <Menu.Item onClick={() => setIsAccountModalOpen(true)}>
                    Account Info
                  </Menu.Item>
                  <Menu.Item onClick={() => setIsInfoModalOpen(true)}>
                    Personal Info
                  </Menu.Item>

                  {dashboardPath && (
                    <Menu.Item onClick={() => navigate(dashboardPath)}>
                      Admin Dashboard
                    </Menu.Item>
                  )}

                  <Menu.Divider />
                  <Menu.Item onClick={handleLogout} danger>
                    Logout
                  </Menu.Item>
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
                  style={{ backgroundColor: "#6d28d9" }}
                />
                <span
                  style={{ color: "#e2e8f0", fontSize: 15, fontWeight: 500 }}
                >
                  {user?.name || "No name"}
                </span>
              </div>
            </Dropdown>
          </>
        ) : (
          <>
            <Button
              onClick={() => navigate("/login")}
              style={{ background: "#e2e8f0" }}
            >
              Sign in
            </Button>
            <Button type="primary" onClick={() => navigate("/signup")}>
              Register
            </Button>
          </>
        )}
        <Button
          className="mobile-menu-button"
          icon={<MenuOutlined />}
          onClick={() => setDrawerVisible(true)}
          style={{ display: "none" }}
        />
      </div>

      <Drawer
        title="Menu"
        placement="right"
        onClose={() => setDrawerVisible(false)}
        visible={drawerVisible}
        width={220}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {navItems.map((item, idx) => (
            <span key={idx} style={{ cursor: "pointer" }}>
              {item}
            </span>
          ))}
          {!token && (
            <>
              <Button block onClick={() => navigate("/login")}>
                Sign In
              </Button>
              <Button block type="primary" onClick={() => navigate("/signup")}>
                Register
              </Button>
            </>
          )}
        </div>
      </Drawer>

      {/* Modals */}
      <AccountModal
        open={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
      />
      <UserInfoModal
        open={isInfoModalOpen}
        onClose={() => setIsInfoModalOpen(false)}
        onShowUpdateModal={(create = false) => {
          setIsInfoModalOpen(false);
          setIsCreate(create); // ✅ set trạng thái tạo mới hay update
          setShowUpdateInfoModal(true);
        }}
      />
      <UpdateUserInfoModal
        open={showUpdateInfoModal}
        isCreate={isCreate} // ✅ truyền prop này vào
        onClose={() => setShowUpdateInfoModal(false)}
        onBackToInfoModal={() => setIsInfoModalOpen(true)}
      />
    </header>
  );
}
