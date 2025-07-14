import React, { useEffect, useState } from "react";
import {
  Layout,
  Row,
  Col,
  Typography,
  Tag,
  Space,
  Spin,
  message,
  Divider,
  Modal,
  Form,
  DatePicker,
  Input,
  Button,
} from "antd";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { getAllRooms } from "../services/roomService";
import { useSelector } from "react-redux";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import LandlordBookAppointmentPage from "./landlord/LandlordBookAppointmentPage";

const { Content } = Layout;
const { Title, Text } = Typography;

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8080";

const getImageUrl = (img) => {
  if (!img) return null;
  if (typeof img === "string") {
    if (img.startsWith("http")) return img;
    if (img.startsWith("/uploads/")) return BACKEND_URL + img;
    return BACKEND_URL + "/uploads/" + img;
  }
  if (typeof img === "object" && img.imageUrl) {
    if (img.imageUrl.startsWith("http")) return img.imageUrl;
    if (img.imageUrl.startsWith("/uploads/")) return BACKEND_URL + img.imageUrl;
    return BACKEND_URL + "/uploads/" + img.imageUrl;
  }
  return null;
};

export default function RoomDetailPage() {
  const { roomNumber } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const reduxUser = useSelector((state) => state.account.user);
  const user = reduxUser || JSON.parse(localStorage.getItem("account"));

  const [room, setRoom] = useState(location.state?.room || null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [loading, setLoading] = useState(!room);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [bookingForm] = Form.useForm();
  const [bookingLoading, setBookingLoading] = useState(false);

  useEffect(() => {
    const hasLandlordInfo = room?.landlordName && room?.landlordPhone;

    if (!room || !hasLandlordInfo) {
      fetchRoomFromAPI();
    } else {
      setSelectedImage(room.images?.[0]?.imageUrl);
      if (room.images?.[0]) setSelectedImage(getImageUrl(room.images[0]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchRoomFromAPI = async () => {
    try {
      const res = await getAllRooms(0, 100, `roomNumber = '${roomNumber}'`);
      if (res.result?.length) {
        const matchedRoom = res.result[0];
        setRoom(matchedRoom);
        setSelectedImage(matchedRoom.images?.[0]?.imageUrl);
        if (matchedRoom.images?.[0]) setSelectedImage(getImageUrl(matchedRoom.images[0]));
      } else {
        message.error("Không tìm thấy phòng.");
      }
    } catch (err) {
      message.error("Không thể tải chi tiết phòng.");
    } finally {
      setLoading(false);
    }
  };

  // Thêm hàm xử lý gửi đặt lịch
  const handleBookingSubmit = async (values) => {
    setBookingLoading(true);
    try {
      // TODO: Gửi dữ liệu booking lên backend nếu có API
      // await apiBookRoom(room.id, values)
      message.success("Đặt lịch hẹn thành công!");
      setBookingModalOpen(false);
      bookingForm.resetFields();
    } catch (err) {
      message.error("Đặt lịch thất bại!");
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: 100 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!room) {
    return (
      <div style={{ textAlign: "center", padding: 100 }}>Không tìm thấy phòng.</div>
    );
  }

  return (
    <div style={{ background: "#fff", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Header />
      {/* Banner ảnh lớn */}
      {/* Xóa hoàn toàn phần hiển thị ảnh lớn (banner) ở đầu trang (nếu còn) */}
      <div style={{ flex: 1 }}>
    <Layout style={{ minHeight: "100vh", background: "#f0f2f5" }}>
      {/* Nút quay lại ra ngoài khối trắng */}
      <div style={{
        width: "100%", maxWidth: 1200, margin: "0 auto", position: "relative", paddingTop: 32
      }}>
        <button
          style={{
            position: "absolute",
            top: 18,
            left: 0,
            background: "#fff",
            border: "1.5px solid #e0e0e0",
            borderRadius: 10,
            padding: "7px 22px",
            fontWeight: 600,
            fontSize: 17,
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
            color: "#1890ff",
            transition: "background 0.2s, color 0.2s",
            zIndex: 10,
          }}
          onClick={() => window.history.back()}
        >
          ← Quay lại
        </button>
      </div>
      <Content
        style={{
          display: "flex",
          justifyContent: "center",
          padding: "24px 0 48px 0",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 1200,
            background: "#fff",
            padding: 36,
            borderRadius: 22,
            boxShadow: "0 6px 32px rgba(0,0,0,0.10)",
            marginTop: 16,
          }}
        >
          <Row gutter={[40, 32]} align="top">
            {/* Image Section */}
            <Col xs={24} md={13} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{
                width: "100%",
                background: "linear-gradient(135deg,#e0f7fa 0%,#fff 100%)",
                borderRadius: 16,
                boxShadow: "0 2px 12px rgba(24,144,255,0.08)",
                padding: 18,
                marginBottom: 18,
                border: "1.5px solid #e0e0e0"
              }}>
                <img
                  src={getImageUrl(selectedImage)}
                  alt="Room Main"
                  style={{
                    width: "100%",
                    maxWidth: 480,
                    height: 320,
                    objectFit: "cover",
                    borderRadius: 14,
                        boxShadow: "0 4px 24px rgba(0,0,0,0.13)",
                        border: "2.5px solid #e0e0e0",
                        background: "#fff",
                    display: "block",
                    margin: "0 auto"
                  }}
                />
              </div>
              <Row gutter={[10, 10]} style={{ width: "100%", maxWidth: 480 }}>
                {room.images?.length > 0 ? (
                  room.images.map((image, index) => (
                    <Col key={index} span={6}>
                      <img
                        src={getImageUrl(image)}
                        alt={`Thumb ${index}`}
                        onClick={() => setSelectedImage(image)}
                        style={{
                          width: "100%",
                          height: 60,
                          objectFit: "cover",
                          border:
                            getImageUrl(selectedImage) === getImageUrl(image)
                                  ? "2.5px solid #e0e0e0"
                              : "1.5px solid #e0e0e0",
                          borderRadius: 8,
                          cursor: "pointer",
                          boxShadow:
                            getImageUrl(selectedImage) === getImageUrl(image)
                                  ? "0 0 0 2px #e0e0e0"
                              : "0 1px 6px rgba(0,0,0,0.07)",
                          transition: "all 0.3s",
                              background: "#fff"
                        }}
                        onMouseOver={e => (e.currentTarget.style.border = "2.5px solid #91d5ff")}
                        onMouseOut={e => (e.currentTarget.style.border = getImageUrl(selectedImage) === getImageUrl(image) ? "2.5px solid #1890ff" : "1.5px solid #e0e0e0")}
                      />
                    </Col>
                  ))
                ) : (
                  <Text>Không có hình ảnh.</Text>
                )}
              </Row>
            </Col>
            {/* Room Info Section */}
            <Col xs={24} md={11}>
              <div style={{
                background: "linear-gradient(135deg,#fff 60%,#e3f2fd 100%)",
                borderRadius: 16,
                    boxShadow: "0 2px 12px rgba(0,0,0,0.07)",
                padding: 28,
                border: "1.5px solid #e0e0e0"
              }}>
                <Space
                  direction="vertical"
                  size="middle"
                  style={{ width: "100%" }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 8,
                    }}
                  >
                        <Title level={3} style={{ margin: 0 }}>
                      Phòng {room.roomNumber}
                    </Title>
                    {(() => {
                      if (!user) return true;
                      const roleName = user?.role?.roleName || user?.role || "";
                      const normalizedRole = (roleName || "").toUpperCase().trim();
                      if (["ADMIN", "SUBADMIN", "LANDLORD"].includes(normalizedRole)) return false;
                      return true;
                    })() && (
                      <>
                            {/* Modal đăng nhập giữ nguyên */}
                        <Modal
                          open={loginModalOpen}
                          onCancel={() => setLoginModalOpen(false)}
                          onOk={() => {
                            setLoginModalOpen(false);
                            navigate("/login");
                          }}
                          okText="Đăng nhập"
                          cancelText="Hủy"
                          closable={false}
                          maskClosable={false}
                          centered
                          bodyStyle={{ padding: 32, textAlign: "center" }}
                        >
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                            <span style={{ fontSize: 40, color: "#1890ff", marginBottom: 12 }}>🔒</span>
                            <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
                              Bạn cần đăng nhập để đặt lịch hẹn.
                            </div>
                            <div style={{ fontSize: 15, color: "#555" }}>
                              Vui lòng đăng nhập để tiếp tục.
                            </div>
                          </div>
                        </Modal>
                      </>
                    )}
                  </div>
                  <Text>
                        <strong>Diện tích:</strong> <span>{room.area} m²</span>
                  </Text>
                  <Text>
                        <strong>Giá:</strong> <span>{room.pricePerMonth?.toLocaleString()} VND/tháng</span>
                  </Text>
                  <Text>
                        <strong>Số phòng ngủ:</strong> <span>{room.numberOfBedrooms}</span>
                  </Text>
                  <Text>
                        <strong>Số phòng tắm:</strong> <span>{room.numberOfBathrooms}</span>
                  </Text>
                  <Text>
                    <strong>Trạng thái:</strong>{" "}
                    <Tag
                      color={
                        room.roomStatus === "Available"
                          ? "green"
                          : room.roomStatus === "Occupied"
                          ? "red"
                          : room.roomStatus === "Maintenance"
                          ? "orange"
                          : "default"
                      }
                      style={{ fontWeight: 600, fontSize: 15 }}
                    >
                      {room.roomStatus === "Available"
                        ? "Có sẵn"
                        : room.roomStatus === "Occupied"
                        ? "Đã thuê"
                        : room.roomStatus === "Maintenance"
                        ? "Bảo trì"
                        : room.roomStatus === "Inactive"
                        ? "Không hoạt động"
                        : room.roomStatus || "Không xác định"}
                    </Tag>
                  </Text>
                  <Text>
                        <strong>Mô tả:</strong> <span>{room.description || "—"}</span>
                  </Text>
                  <Text>
                        <strong>Hoạt động:</strong> <span>{room.isActive ? "Có" : "Không"}</span>
                  </Text>
                  <Text>
                        <strong>Chủ nhà:</strong> <span>{room.landlordName || "Không có"}</span> | <span>{room.landlordPhone || "Không có số điện thoại"}</span>
                  </Text>
                </Space>
                {/* Assets Section */}
                {room.assets?.length > 0 && (
                  <>
                    <Divider />
                        <Title level={5}>Tài sản</Title>
                    <ul style={{ marginLeft: 18 }}>
                      {room.assets.map((a, i) => (
                        <li key={i} style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                          {a.assetImage ? (
                            <img
                              src={getImageUrl(a.assetImage)}
                              alt={a.assetName}
                              style={{ width: 40, height: 28, objectFit: 'cover', borderRadius: 4, marginRight: 10, border: '1px solid #e0e0e0', background: '#fafafa' }}
                            />
                          ) : null}
                          <span>{a.assetName}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                {/* Services Section */}
                {room.services?.length > 0 && (
                  <>
                    <Divider />
                        <Title level={5}>Dịch vụ</Title>
                    <ul style={{ marginLeft: 18 }}>
                      {room.services.map((s, i) => (
                        <li key={i}>{s.serviceName}</li>
                      ))}
                    </ul>
                  </>
                )}
                    {/* Nút đặt lịch hẹn chuyển xuống dưới cùng */}
                    {(() => {
                      if (!user) return true;
                      const roleName = user?.role?.roleName || user?.role || "";
                      const normalizedRole = (roleName || "").toUpperCase().trim();
                      if (["ADMIN", "SUBADMIN", "LANDLORD"].includes(normalizedRole)) return false;
                      return true;
                    })() && (
                      <>
                        <button
                          style={{
                            background: "#1890ff",
                            color: "#fff",
                            border: "none",
                            borderRadius: 6,
                            padding: "8px 20px",
                            fontWeight: 500,
                            fontSize: 16,
                            cursor: "pointer",
                            marginTop: 24,
                            boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
                            transition: "background 0.2s",
                            width: '100%'
                          }}
                          onClick={() => {
                            if (!user) {
                              setLoginModalOpen(true);
                            } else {
                              setBookingModalOpen(true);
                            }
                          }}
                        >
                          Đặt lịch hẹn
                        </button>
                        <Modal
                          open={bookingModalOpen}
                          onCancel={() => setBookingModalOpen(false)}
                          footer={null}
                          width={1000}
                          centered
                          destroyOnClose
                          bodyStyle={{ padding: 0 }}
                        >
                          <LandlordBookAppointmentPage
                            room={room}
                            user={user}
                            onSuccess={() => setBookingModalOpen(false)}
                            onCancel={() => setBookingModalOpen(false)}
                            isPopup
                          />
                        </Modal>
                      </>
                    )}
              </div>
            </Col>
          </Row>
        </div>
      </Content>
    </Layout>
      </div>
      <Footer />
    </div>
  );
}