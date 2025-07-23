import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { logout as logoutService } from "../../services/authService";
import logo from "../../assets/logo.png";
import {
  Dropdown,
  Menu,
  Avatar,
  Typography,
  Button,
  Drawer,
  Badge,
  List,
  Spin,
  Modal,
} from "antd";
import { MenuOutlined, UserOutlined, BellOutlined } from "@ant-design/icons";
import AccountModal from "../account/AccountModal";
import UserInfoModal from "../account/UserInfoModal";
import UpdateUserInfoModal from "../account/UpdateUserInfoPage";
import {
  getMyNotifications,
  markNotificationRead,
} from "../../services/notificationApi";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { getCurrentUser } from "../../services/authService";
import { getAccountInfo } from "../../services/userApi";
import BookingListModal from "../account/BookingListModal";
dayjs.extend(relativeTime);

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
  const [notifications, setNotifications] = useState([]);
  const [loadingNoti, setLoadingNoti] = useState(false);
  const [notiOpen, setNotiOpen] = useState(false);
  const [tab, setTab] = useState("all"); // "all" | "unread"
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedNoti, setSelectedNoti] = useState(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [ocrData, setOcrData] = useState(null);

  let dateStr = "N/A";
  if (selectedNoti?.createdDate && dayjs(selectedNoti.createdDate).isValid()) {
    dateStr = dayjs(selectedNoti.createdDate).format("HH:mm DD/MM/YYYY");
  }

  // ✅ Hàm xác định dashboard path theo role
  const getDashboardPath = () => {
    const role = user?.role?.roleName || user?.role;
    const roleId = user?.role?.roleId || user?.role?.id;
    if (
      roleId === 3 ||
      (typeof role === "string" && role.toUpperCase() === "LANDLORD")
    )
      return "/landlord/renters";
    if (
      roleId === 2 ||
      (typeof role === "string" && role.toUpperCase() === "RENTER")
    )
      return "/renter/room";
    if (
      roleId === 1 ||
      (typeof role === "string" && role.toUpperCase() === "ADMIN")
    )
      return "/admin/users";
    if (typeof role === "string" && role.toUpperCase() === "SUBADMIN")
      return "/admin/users";
    return null;
  };
  const dashboardPath = getDashboardPath();

  const getDashboardLabel = () => {
    const role = user?.role?.roleName || user?.role;
    const roleId = user?.role?.roleId || user?.role?.id;
    if (
      roleId === 3 ||
      (typeof role === "string" && role.toUpperCase() === "LANDLORD")
    )
      return "Bảng điều khiển";
    if (
      roleId === 2 ||
      (typeof role === "string" && role.toUpperCase() === "RENTER")
    )
      return "Bảng điều khiển";
    if (
      roleId === 1 ||
      (typeof role === "string" && role.toUpperCase() === "ADMIN")
    )
      return "Bảng điều khiển";
    if (typeof role === "string" && role.toUpperCase() === "SUBADMIN")
      return "Bảng điều khiển";
    return "Bảng điều khiển";
  };

  const handleLogout = () => {
    logoutService(dispatch);
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

  // Lấy fullName khi component mount
  useEffect(() => {
    const fetchUserFullName = async () => {
      if (token && user) {
        try {
          const accountRes = await getAccountInfo();
          if (accountRes?.fullName) {
            const updatedUser = { ...user, fullName: accountRes.fullName };
            setUser(updatedUser);
            localStorage.setItem("user", JSON.stringify(updatedUser));
          }
        } catch (e) {
          // Không cần xử lý lỗi
        }
      }
    };
    fetchUserFullName();
  }, [token, user?.id]); // Chỉ chạy khi có token và user id

  const fetchNotifications = async () => {
    setLoadingNoti(true);
    try {
      const res = await getMyNotifications();
      setNotifications(res || []);
    } finally {
      setLoadingNoti(false);
    }
  };

  useEffect(() => {
    if (notiOpen) fetchNotifications();
  }, [notiOpen]);

  useEffect(() => {
    // Polling mỗi 20s để cập nhật notifications
    const interval = setInterval(() => {
      fetchNotifications();
    }, 20000); // 20 giây
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Polling mỗi 30s để cập nhật user (role)
    const interval = setInterval(async () => {
      try {
        const res = await getCurrentUser();
        if (res && res.role) {
          // Lấy thêm fullName từ account API
          try {
            const accountRes = await getAccountInfo();
            const updatedUser = { 
              ...user, 
              ...res, 
              fullName: accountRes?.fullName,
              role: res.role 
            };
            setUser(updatedUser);
            localStorage.setItem("user", JSON.stringify(updatedUser));
          } catch (e) {
            const updatedUser = { ...user, ...res, role: res.role };
            setUser(updatedUser);
            localStorage.setItem("user", JSON.stringify(updatedUser));
          }
        }
      } catch (e) {}
    }, 30000); // đổi thành 30s
    return () => clearInterval(interval);
  }, []);

  const filteredNotifications =
    tab === "all"
      ? notifications
      : notifications.filter((n) => n.status !== "READ");

  const handleClickNotification = async (id) => {
    const noti = notifications.find((n) => n.id === id);
    setSelectedNoti(noti);
    setModalOpen(true);
    if (noti.status !== "READ") {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, status: "READ" } : n))
      );
      await markNotificationRead(id);
    }
  };

  const unreadCount = notifications.filter((n) => n.status !== "READ").length;

  const notiMenu = (
    <div
      style={{
        width: 350,
        maxHeight: 420,
        background: "#fff",
        borderRadius: 10,
        boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "14px 20px 8px 20px",
          borderBottom: "1px solid #f0f0f0",
          background: "#f7fafd",
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 17, color: "#222" }}>
          Thông báo
        </div>
        <div style={{ marginTop: 8, display: "flex", gap: 16 }}>
          <span
            style={{
              fontWeight: tab === "all" ? 600 : 400,
              color: tab === "all" ? "#1890ff" : "#555",
              cursor: "pointer",
              borderBottom: tab === "all" ? "2px solid #1890ff" : "none",
              paddingBottom: 2,
            }}
            onClick={() => setTab("all")}
          >
            Tất cả
          </span>
          <span
            style={{
              fontWeight: tab === "unread" ? 600 : 400,
              color: tab === "unread" ? "#1890ff" : "#555",
              cursor: "pointer",
              borderBottom: tab === "unread" ? "2px solid #1890ff" : "none",
              paddingBottom: 2,
            }}
            onClick={() => setTab("unread")}
          >
            Chưa đọc
          </span>
        </div>
      </div>
      {/* Danh sách */}
      <div style={{ maxHeight: 340, overflowY: "auto" }}>
        <List
          dataSource={filteredNotifications}
          renderItem={(item) => (
            <List.Item
              style={{
                background: item.status !== "READ" ? "#f0f7ff" : "#fff",
                cursor: "pointer",
                padding: "12px 20px",
                borderBottom: "1px solid #f0f0f0",
              }}
              onClick={() => handleClickNotification(item.id)}
            >
              <div style={{ width: "100%" }}>
                <div
                  style={{
                    fontWeight: item.status !== "READ" ? 600 : 400,
                    color: "#222",
                    fontSize: 15,
                  }}
                >
                  {item.title}
                </div>
                <div style={{ color: "#999", fontSize: 12, marginTop: 2 }}>
                  {dayjs(item.createdDate).fromNow()}
                </div>
              </div>
            </List.Item>
          )}
          locale={{ emptyText: "Không có thông báo" }}
        />
      </div>
    </div>
  );

  const navItems = ["Phòng", "Dịch vụ", "Người thuê", "Liên hệ", "Giới thiệu"];

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

      <div className="desktop-nav" style={{ display: "flex", gap: 50 }}>
        {navItems.map((label, idx) => (
          <span
            key={idx}
            style={{ color: "#cbd5e1", fontSize: 15, cursor: "pointer" }}
            onMouseOver={(e) => (e.target.style.color = "#fff")}
            onMouseOut={(e) => (e.target.style.color = "#cbd5e1")}
            onClick={() => {
              if (label === "Phòng") {
                if (window.location.pathname === "/" || window.location.pathname === "/home") {
                  setTimeout(() => {
                    const el = document.getElementById("room-list-section");
                    if (el) el.scrollIntoView({ behavior: "smooth" });
                  }, 100);
                } else {
                  navigate("/home");
                  setTimeout(() => {
                    const el = document.getElementById("room-list-section");
                    if (el) el.scrollIntoView({ behavior: "smooth" });
                  }, 400);
                }
              }
              if (label === "Liên hệ") {
                if (window.location.pathname === "/" || window.location.pathname === "/home") {
                  setTimeout(() => {
                    const el = document.getElementById("footer");
                    if (el) el.scrollIntoView({ behavior: "smooth" });
                  }, 100);
                } else {
                  navigate("/home");
                  setTimeout(() => {
                    const el = document.getElementById("footer");
                    if (el) el.scrollIntoView({ behavior: "smooth" });
                  }, 400);
                }
              }
            }}
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
                    Thông tin tài khoản
                  </Menu.Item>
                  <Menu.Item onClick={() => setIsInfoModalOpen(true)}>
                    Thông tin cá nhân
                  </Menu.Item>
                  {(!user?.role || user?.role?.roleName === "RENTER") && (
                    <Menu.Item onClick={() => setShowBookingModal(true)}>
                      Lịch hẹn
                    </Menu.Item>
                  )}
                  {dashboardPath && (
                    <Menu.Item onClick={() => navigate(dashboardPath)}>
                      {getDashboardLabel()}
                    </Menu.Item>
                  )}
                  <Menu.Divider />
                  <Menu.Item onClick={handleLogout} danger>
                    Đăng xuất
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
                  style={{ color: "#e2e8f0", fontSize: 15, fontWeight: 400 }}
                >
                  {user?.fullName ||
                    user?.name ||
                    user?.username ||
                    user?.email ||
                    "Người dùng"}
                </span>
              </div>
            </Dropdown>
            <Dropdown
              overlay={notiMenu}
              trigger={["click"]}
              open={notiOpen}
              onOpenChange={setNotiOpen}
              placement="bottomRight"
              arrow
            >
              {unreadCount > 0 ? (
                <Badge count={unreadCount} size="small" offset={[-4, 2]}>
                  <BellOutlined
                    style={{
                      fontSize: 22,
                      cursor: "pointer",
                      marginRight: 12,
                      color: "#fff",
                    }}
                  />
                </Badge>
              ) : (
                <BellOutlined
                  style={{
                    fontSize: 22,
                    cursor: "pointer",
                    marginRight: 12,
                    color: "#fff",
                  }}
                />
              )}
            </Dropdown>
          </>
        ) : (
          <>
            <Button
              onClick={() => navigate("/login")}
              style={{ background: "#e2e8f0" }}
            >
              Đăng nhập
            </Button>
            <Button type="primary" onClick={() => navigate("/signup")}>
              Đăng ký
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
                Đăng nhập
              </Button>
              <Button block type="primary" onClick={() => navigate("/signup")}>
                Đăng ký
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
        onShowUpdateModal={(create = false, ocrData = null) => {
          setIsInfoModalOpen(false);
          setIsCreate(create); // ✅ set trạng thái tạo mới hay update
          setShowUpdateInfoModal(true);
          setOcrData(ocrData);
        }}
      />
      <UpdateUserInfoModal
        open={showUpdateInfoModal}
        isCreate={isCreate} // ✅ truyền prop này vào
        onClose={() => setShowUpdateInfoModal(false)}
        onBackToInfoModal={() => setIsInfoModalOpen(true)}
        ocrData={ocrData}
      />
      <Modal
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        title={null}
        width={480}
      >
        <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 8 }}>
          Tiêu đề:{" "}
          <span style={{ fontWeight: 400 }}>
            {selectedNoti?.title === 'Booking Confirmed' ? 'Đặt lịch đã xác nhận' : selectedNoti?.title}
          </span>
        </div>
        <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 8 }}>
          Nội dung:{" "}
          <span style={{ fontWeight: 400 }}>
            {selectedNoti?.message && selectedNoti?.message.startsWith('Your booking for room') && selectedNoti?.message.includes('has been confirmed by the landlord')
              ? `Lịch hẹn của bạn cho phòng ${selectedNoti?.message.match(/room (\d+)/)?.[1] || ''} đã được chủ nhà xác nhận!`
              : selectedNoti?.message}
          </span>
        </div>
        <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 8 }}>
          Ngày tạo: <span style={{ fontWeight: 400 }}>{dateStr}</span>
        </div>
      </Modal>
      <BookingListModal
        open={showBookingModal}
        onClose={() => setShowBookingModal(false)}
        currentUser={user}
      />
    </header>
  );
}
