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
} from "antd";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { getAllRooms } from "../services/roomService";
import { useSelector } from "react-redux";

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
    <Layout style={{ minHeight: "100vh", background: "#f0f2f5" }}>
      <Content
        style={{
          display: "flex",
          justifyContent: "center",
          padding: "48px 24px",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 1440,
            background: "#fff",
            padding: 32,
            borderRadius: 16,
            boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
          }}
        >
          <Row gutter={[48, 32]} align="top">
            {/* Image Section */}
            <Col xs={24} md={14}>
              <img
                src={getImageUrl(selectedImage)}
                alt="Room Main"
                style={{
                  width: "100%",
                  height: 360,
                  objectFit: "cover",
                  borderRadius: 12,
                  marginBottom: 16,
                  boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
                }}
              />
              <Row gutter={[12, 12]}>
                {room.images?.length > 0 ? (
                  room.images.map((image, index) => (
                    <Col key={index} span={6}>
                      <img
                        src={getImageUrl(image)}
                        alt={`Thumb ${index}`}
                        onClick={() => setSelectedImage(image)}
                        style={{
                          width: "100%",
                          height: 80,
                          objectFit: "cover",
                          border:
                            getImageUrl(selectedImage) === getImageUrl(image)
                              ? "2px solid #1890ff"
                              : "1px solid #ccc",
                          borderRadius: 8,
                          cursor: "pointer",
                          transition: "all 0.3s",
                        }}
                      />
                    </Col>
                  ))
                ) : (
                  <Text>Không có hình ảnh.</Text>
                )}
              </Row>
            </Col>

            {/* Room Info Section */}
            <Col xs={24} md={10}>
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
                          marginLeft: 16,
                        }}
                        onClick={() => {
                          if (!user) {
                            setLoginModalOpen(true);
                          } else {
                            navigate(`/landlord/rooms/${room.id}/book`, {
                              state: {
                                room,
                                user,
                              },
                            });
                          }
                        }}
                      >
                        Đặt lịch hẹn
                      </button>
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
                  <strong>Diện tích:</strong> {room.area} m²
                </Text>
                <Text>
                  <strong>Giá:</strong> {room.pricePerMonth?.toLocaleString()}{" "}
                  VND/tháng
                </Text>
                <Text>
                  <strong>Số phòng ngủ:</strong> {room.numberOfBedrooms}
                </Text>
                <Text>
                  <strong>Số phòng tắm:</strong> {room.numberOfBathrooms}
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
                  >
                    {room.roomStatus === "Available" ? "Có sẵn" :
                     room.roomStatus === "Occupied" ? "Đã thuê" :
                     room.roomStatus === "Maintenance" ? "Bảo trì" :
                     room.roomStatus === "Inactive" ? "Không hoạt động" :
                     room.roomStatus || "Không xác định"}
                  </Tag>
                </Text>
                <Text>
                  <strong>Mô tả:</strong> {room.description || "—"}
                </Text>
                <Text>
                  <strong>Hoạt động:</strong> {room.isActive ? "Có" : "Không"}
                </Text>
                <Text>
                  <strong>Chủ nhà:</strong> {room.landlordName || "Không có"} |{" "}
                  {room.landlordPhone || "Không có số điện thoại"}
                </Text>
              </Space>

              {/* Assets Section */}
              {room.assets?.length > 0 && (
                <>
                  <Divider />
                  <Title level={5}>Tài sản</Title>
                  <ul>
                    {room.assets.map((a, i) => (
                      <li key={i}>{a.assetName}</li>
                    ))}
                  </ul>
                </>
              )}

              {/* Services Section */}
              {room.services?.length > 0 && (
                <>
                  <Divider />
                  <Title level={5}>Dịch vụ</Title>
                  <ul>
                    {room.services.map((s, i) => (
                      <li key={i}>{s.serviceName}</li>
                    ))}
                  </ul>
                </>
              )}
            </Col>
          </Row>
        </div>
      </Content>
    </Layout>
  );
}