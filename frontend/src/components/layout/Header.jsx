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

// Hàm chuyển đổi thời gian tương đối sang tiếng Việt
const getRelativeTimeInVietnamese = (date) => {
  const now = dayjs();
  const targetDate = dayjs(date);
  const diffInSeconds = now.diff(targetDate, "second");
  const diffInMinutes = now.diff(targetDate, "minute");
  const diffInHours = now.diff(targetDate, "hour");
  const diffInDays = now.diff(targetDate, "day");
  const diffInWeeks = now.diff(targetDate, "week");
  const diffInMonths = now.diff(targetDate, "month");
  const diffInYears = now.diff(targetDate, "year");

  if (diffInSeconds < 60) {
    return "Vừa xong";
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes} phút trước`;
  } else if (diffInHours < 24) {
    return `${diffInHours} giờ trước`;
  } else if (diffInDays < 7) {
    return `${diffInDays} ngày trước`;
  } else if (diffInWeeks < 4) {
    return `${diffInWeeks} tuần trước`;
  } else if (diffInMonths < 12) {
    return `${diffInMonths} tháng trước`;
  } else {
    return `${diffInYears} năm trước`;
  }
};

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
  const [previousUnreadCount, setPreviousUnreadCount] = useState(0);
  const [notificationToast, setNotificationToast] = useState({ show: false, message: '', type: 'info' });

  let dateStr = "N/A";
  if (selectedNoti?.createdDate && dayjs(selectedNoti.createdDate).isValid()) {
    dateStr = dayjs(selectedNoti.createdDate).format("HH:mm DD/MM/YYYY");
  }

  // Định dạng ngày trong nội dung thông báo (YYYY-MM-DD -> DD/MM/YYYY)
  const formatDatesInText = (text) => {
    if (!text) return text;
    const input = String(text);
    return input.replace(/\b(\d{4})-(\d{2})-(\d{2})\b/g, (m, y, mo, d) => {
      const iso = `${y}-${mo}-${d}`;
      return dayjs(iso).isValid() ? dayjs(iso).format("DD/MM/YYYY") : m;
    });
  };

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
      const newNotifications = res || [];
      const newUnreadCount = newNotifications.filter((n) => n.status !== "READ").length;
      
      // 🆕 Kiểm tra nếu có thông báo mới (tăng số lượng chưa đọc)
      console.log('🔔 DEBUG Notifications:', { 
        newUnreadCount, 
        previousUnreadCount, 
        shouldShowToast: newUnreadCount > previousUnreadCount && previousUnreadCount >= 0,
        notifications: newNotifications 
      });
      
      if (newUnreadCount > previousUnreadCount && previousUnreadCount >= 0) {
        // 🆕 Hiện notification toast
        const latestNotification = newNotifications.find(n => n.status !== "READ");
        const toastMessage = latestNotification?.title || "Bạn có thông báo mới";
        console.log('🚀 Showing toast:', { latestNotification, toastMessage });
        
        setNotificationToast({ 
          show: true, 
          message: toastMessage, 
          type: 'success' 
        });
        
        // Tự động ẩn toast sau 4 giây
        setTimeout(() => {
          setNotificationToast({ show: false, message: '', type: 'info' });
        }, 4000);
      }
      
      setNotifications(newNotifications);
      setPreviousUnreadCount(newUnreadCount);
    } finally {
      setLoadingNoti(false);
    }
  };

  // 🆕 Thêm listener để refresh thông báo ngay lập tức khi có action quan trọng
  useEffect(() => {
    const handleRefreshNotifications = () => {
      fetchNotifications();
    };

    // 🆕 Thêm listener để hiện toast khi có action cụ thể
    const handleShowToast = (e) => {
      const { message, type = 'success' } = e.detail || {};
      console.log('🎯 Show toast event received:', { message, type });
      if (message) {
        console.log('✅ Setting toast state to show');
        setNotificationToast({ 
          show: true, 
          message, 
          type 
        });
        
        // Tự động ẩn toast sau 4 giây
        setTimeout(() => {
          console.log('⏰ Auto-hiding toast');
          setNotificationToast({ show: false, message: '', type: 'info' });
        }, 4000);
      }
    };

    // Lắng nghe custom event để refresh notifications
    window.addEventListener('refresh-notifications', handleRefreshNotifications);
    window.addEventListener('show-notification-toast', handleShowToast);
    
    return () => {
      window.removeEventListener('refresh-notifications', handleRefreshNotifications);
      window.removeEventListener('show-notification-toast', handleShowToast);
    };
  }, []);

  useEffect(() => {
    if (notiOpen) fetchNotifications();
  }, [notiOpen]);

  // 🆕 Init previous unread count khi mount
  useEffect(() => {
    const initNotifications = async () => {
      try {
        const res = await getMyNotifications();
        const notifications = res || [];
        const unreadCount = notifications.filter((n) => n.status !== "READ").length;
        setPreviousUnreadCount(unreadCount);
        setNotifications(notifications);
        
        // 🆕 Test toast function - có thể xóa sau khi test xong
        window.testToast = () => {
          console.log('🧪 Testing toast...');
          setNotificationToast({ 
            show: true, 
            message: 'Test notification toast!', 
            type: 'success' 
          });
          setTimeout(() => {
            setNotificationToast({ show: false, message: '', type: 'info' });
          }, 4000);
        };
        console.log('🧪 Test function available: window.testToast()');
      } catch (error) {
        console.error('Error initializing notifications:', error);
      }
    };
    
    if (token && user) {
      initNotifications();
    }
  }, [token, user?.id]);

    useEffect(() => {
    // 🆕 Polling mỗi 5s để cập nhật notifications (tăng tốc độ nhận thông báo)
    const interval = setInterval(() => {
      fetchNotifications();
}, 5000); // 5 giây thay vì 20 giây
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
              role: res.role,
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
                  {getRelativeTimeInVietnamese(item.createdDate)}
                </div>
              </div>
            </List.Item>
          )}
          locale={{ emptyText: "Không có thông báo" }}
        />
      </div>
    </div>
  );

  const navItems = ["Phòng", "Liên hệ", "Giới thiệu", "Nội quy"]; 

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
                if (
                  window.location.pathname === "/" ||
                  window.location.pathname === "/home"
                ) {
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
                if (
                  window.location.pathname === "/" ||
                  window.location.pathname === "/home"
                ) {
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
              if (label === "Giới thiệu") {
                navigate("/about");
              }
              if (label === "Nội quy") {
                navigate("/noi-quy");
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
            {selectedNoti?.title === "Booking Confirmed"
              ? "Đặt lịch đã xác nhận"
              : selectedNoti?.title}
          </span>
        </div>
        <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 8 }}>
          Nội dung:{" "}
          <span style={{ fontWeight: 400 }}>
            {(() => {
              const original = (selectedNoti?.message &&
                selectedNoti?.message.startsWith("Your booking for room") &&
                selectedNoti?.message.includes("has been confirmed by the landlord"))
                ? `Lịch hẹn của bạn cho phòng ${
                    selectedNoti?.message.match(/room (\d+)/)?.[1] || ""
                  } đã được chủ nhà xác nhận!`
                : selectedNoti?.message;
              return formatDatesInText(original);
            })()}
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

                    {/* 🆕 Notification Toast - Hiện ra bên ngoài và tự biến mất */}
       {console.log('📱 Toast render check:', notificationToast)}
       {notificationToast.show && (
        <div
          style={{
            position: 'fixed',
            top: '70px', // Dưới header bar (header thường cao ~60px)
            right: '05px',
            zIndex: 10000,
            backgroundColor: '#52c41a',
            color: 'white',
            padding: '12px 20px',
            borderRadius: '8px',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            minWidth: '300px',
            maxWidth: '400px',
            animation: 'slideInFromRight 0.3s ease-out',
            cursor: 'pointer',
          }}
          onClick={() => {
            setNotificationToast({ show: false, message: '', type: 'info' });
            setNotiOpen(true);
          }}
        >
          <div
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              borderRadius: '50%',
              width: '24px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <BellOutlined style={{ color: 'white', fontSize: '14px' }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '2px' }}>
              Thông báo mới
            </div>
            <div style={{ fontSize: '13px', opacity: 0.9, lineHeight: '1.3' }}>
              {notificationToast.message}
            </div>
          </div>
          <div style={{ fontSize: '12px', opacity: 0.7, flexShrink: 0 }}>
            Click để xem
          </div>
        </div>
      )}
    </header>
  );
}
