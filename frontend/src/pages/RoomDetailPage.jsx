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
import Image360Viewer from "../components/Image360Viewer";
import { SyncOutlined } from "@ant-design/icons";
import { getPersonalInfo } from "../services/userApi";
import UserInfoModal from "../components/account/UserInfoModal";
import UpdateUserInfoPage from "../components/account/UpdateUserInfoPage";
import scheduleApi from "../services/scheduleApi";
import dayjs from "dayjs";
import { getAssetsByRoomNumber } from "../services/assetApi";

const { Content } = Layout;
const { Title, Text } = Typography;

const isDev = import.meta.env.DEV;
const BACKEND_URL = isDev
  ? (import.meta.env.VITE_BACKEND_URL || "http://52.184.69.15")
  : (typeof window !== "undefined" ? window.location.origin : "");

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
  const user = reduxUser || (() => {
    try {
      const account = localStorage.getItem("account");
      return account ? JSON.parse(account) : null;
    } catch (error) {
      return null;
    }
  })();

  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);
  const [images360, setImages360] = useState([]);
  const [viewer360Open, setViewer360Open] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [personalInfoModalOpen, setPersonalInfoModalOpen] = useState(false);
  const [checkingPersonalInfo, setCheckingPersonalInfo] = useState(false);
  const [bookingForm] = Form.useForm();
  const [bookingLoading, setBookingLoading] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [showUpdateInfoModal, setShowUpdateInfoModal] = useState(false);
  const [isCreate, setIsCreate] = useState(false);
  const [ocrData, setOcrData] = useState(null);
  const [roomAssets, setRoomAssets] = useState([]);
  const [roomAssetsLoading, setRoomAssetsLoading] = useState(false);

  useEffect(() => {
    const hasLandlordInfo = room?.landlordName && room?.landlordPhone;

    if (!room || !hasLandlordInfo) {
      fetchRoomFromAPI();
    } else {
      setSelectedImage(room.images?.[0]?.imageUrl);
      if (room.images?.[0]) setSelectedImage(getImageUrl(room.images[0]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomNumber]);

  // Generate 360 images when room data is available
  useEffect(() => {
    if (room) {
      // Generate 360 degree images for room
      const generateImages = () => {
        // Use actual room images if available, otherwise create demo
        let baseImages = [];
        
        if (room?.images && room.images.length > 0) {
          // Use actual room images
          baseImages = room.images.map(img => getImageUrl(img)).filter(Boolean);
        }
        
        // If no room images or they don't load, create placeholder demo
        if (baseImages.length === 0) {
          // Use placeholder images with different backgrounds
          const placeholderImages = [];
          for (let i = 0; i < 8; i++) {
            // Create data URLs for simple colored backgrounds as demo
            const canvas = document.createElement('canvas');
            canvas.width = 400;
            canvas.height = 300;
            const ctx = canvas.getContext('2d');
            
            // Create gradient backgrounds
            const gradient = ctx.createLinearGradient(0, 0, 400, 300);
            const hue = (i * 45) % 360; // Different colors
            gradient.addColorStop(0, `hsl(${hue}, 70%, 60%)`);
            gradient.addColorStop(1, `hsl(${hue + 30}, 70%, 40%)`);
            
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, 400, 300);
            
            // Add room indication
            ctx.fillStyle = 'white';
            ctx.font = '24px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`Phòng ${room.roomNumber}`, 200, 150);
            ctx.font = '16px Arial';
            ctx.fillText(`Góc ${i + 1}`, 200, 180);
            
            placeholderImages.push(canvas.toDataURL());
          }
          baseImages = placeholderImages;
        }
        
        // Create smooth 360 rotation
        const images360 = [];
        const totalFrames = 36; // 36 frames for good performance
        
        for (let i = 0; i < totalFrames; i++) {
          // Calculate which base image to use
          const imageIndex = Math.floor((i / totalFrames) * baseImages.length) % baseImages.length;
          images360.push(baseImages[imageIndex]);
        }
        
        return images360;
      };

      setImages360(generateImages());
    }
  }, [room]);

  // Fetch room assets once room information is available
  useEffect(() => {
    const loadAssetsForRoom = async () => {
      if (!room || !room.roomNumber) return;
      setRoomAssetsLoading(true);
      try {
        const res = await getAssetsByRoomNumber(room.roomNumber);
        const assets = res?.data || res?.result || [];
        setRoomAssets(Array.isArray(assets) ? assets : []);
      } catch (error) {
        setRoomAssets([]);
      } finally {
        setRoomAssetsLoading(false);
      }
    };
    loadAssetsForRoom();
  }, [room]);

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

  // Thêm hàm kiểm tra thông tin cá nhân
  const checkPersonalInfo = async () => {
    if (!user) return false;
    
    setCheckingPersonalInfo(true);
    try {
      const personalInfo = await getPersonalInfo();
      // Kiểm tra các trường bắt buộc
      const hasRequiredInfo = personalInfo && 
        personalInfo.fullName && 
        personalInfo.phoneNumber && 
        personalInfo.phoneNumber2 && 
        personalInfo.gender && 
        personalInfo.birthDate && 
        personalInfo.birthPlace && 
        personalInfo.nationalID && 
        personalInfo.nationalIDIssuePlace && 
        personalInfo.permanentAddress;
      
      return !!hasRequiredInfo;
    } catch (error) {
      // Nếu không có thông tin cá nhân hoặc lỗi, trả về false
      return false;
    } finally {
      setCheckingPersonalInfo(false);
    }
  };

  // Thêm hàm xử lý click đặt lịch
  const handleBookingClick = async () => {
    if (!user) {
      setLoginModalOpen(true);
      return;
    }

    // Kiểm tra thông tin cá nhân
    const hasPersonalInfo = await checkPersonalInfo();
    if (!hasPersonalInfo) {
      setPersonalInfoModalOpen(true);
      return;
    }

    // Nếu có đủ thông tin, mở modal đặt lịch
    setBookingModalOpen(true);
  };

  // Thêm hàm xử lý gửi đặt lịch
  const handleBookingSubmit = async (values) => {
    setBookingLoading(true);
    try {
      const appointmentDate = values.date;
      const appointmentTime = values.time;
      let appointmentDateTime = null;

      if (appointmentDate && appointmentTime) {
        appointmentDateTime = appointmentDate
          .hour(appointmentTime.hour())
          .minute(appointmentTime.minute())
          .second(0)
          .millisecond(0);
      }

      await scheduleApi.bookAppointment({
        roomId: room.id,
        fullName: values.name,
        phone: values.phone,
        email: values.email,
        appointmentTime: appointmentDateTime
          ? appointmentDateTime.toISOString()
          : null,
        note: values.note,
      });

      message.success("Đặt lịch hẹn thành công!");
      setBookingModalOpen(false);
      bookingForm.resetFields();
    } catch (err) {
      console.error("[DEBUG] booking error:", err);
      const errorMessage = err.response?.data?.message || err.message || "Đặt lịch thất bại";
      message.error(errorMessage);
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
    <Layout style={{ minHeight: "100vh", background: "#f8f9fa" }}>
      <Header />
      
      <Content style={{ padding: "20px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          {/* Back Button */}
          <Button
            onClick={() => window.history.back()}
            style={{
              marginBottom: 20,
              background: "#fff",
              border: "1px solid #e8e8e8",
              borderRadius: 6,
              padding: "8px 16px",
              height: "auto",
              display: "flex",
              alignItems: "center",
              gap: 8,
              boxShadow: "0 1px 4px rgba(0,0,0,0.1)"
            }}
          >
            ← Quay lại
          </Button>

          {/* Room Header */}
          <div
            style={{
              background: "#fff",
              borderRadius: 12,
              padding: "24px",
              marginBottom: 20,
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              border: "1px solid #f0f0f0"
            }}
          >
            <Row align="middle" justify="space-between">
              <Col>
                <Title level={2} style={{ margin: 0, marginBottom: 4, fontWeight: 600 }}>
                  Phòng {room.roomNumber}
                </Title>
                <Text style={{ fontSize: 16, color: "#666" }}>
                  {room.pricePerMonth?.toLocaleString()} VND/tháng • {room.area} m²
                </Text>
              </Col>
              <Col>
                <Tag
                  color={
                    room.roomStatus === "Available" ? "green" :
                    room.roomStatus === "Occupied" ? "red" :
                    room.roomStatus === "Maintenance" ? "orange" : "default"
                  }
                  style={{ 
                    fontSize: 14, 
                    padding: "4px 12px", 
                    borderRadius: 6,
                    fontWeight: 400
                  }}
                >
                  {room.roomStatus === "Available" ? "Còn trống" :
                   room.roomStatus === "Occupied" ? "Đã thuê" :
                   room.roomStatus === "Maintenance" ? "Bảo trì" :
                   room.roomStatus === "Inactive" ? "Không hoạt động" :
                   room.roomStatus || "Không xác định"}
                </Tag>
              </Col>
            </Row>
          </div>

          <Row gutter={[20, 20]}>
            {/* Left Column - Images */}
            <Col xs={24} lg={14}>
              {/* Main Image */}
              <div
                style={{
                  background: "#fff",
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 16,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                  border: "1px solid #f0f0f0"
                }}
              >
                <div style={{
                  borderRadius: 8,
                  overflow: "hidden",
                  marginBottom: 12,
                  position: "relative"
                }}>
                  <img
                    src={getImageUrl(selectedImage)}
                    alt="Room Main"
                    style={{
                      width: "100%",
                      height: 400,
                      objectFit: "cover",
                      display: "block"
                    }}
                  />
                  <div style={{
                    position: "absolute",
                    top: 12,
                    right: 12,
                    background: "rgba(0,0,0,0.7)",
                    color: "#fff",
                    padding: "6px 10px",
                    borderRadius: 6,
                    fontSize: 13,
                    fontWeight: 400
                  }}>
                    {room.images?.length || 0} ảnh
                  </div>
                </div>

                {/* Thumbnail Grid */}
                <Row gutter={[8, 8]}>
                  {room.images?.length > 0 ? (
                    room.images.slice(0, 6).map((image, index) => (
                      <Col key={index} span={4}>
                        <div
                          onClick={() => setSelectedImage(image)}
                          style={{
                            borderRadius: 6,
                            overflow: "hidden",
                            cursor: "pointer",
                            border: getImageUrl(selectedImage) === getImageUrl(image)
                              ? "2px solid #1890ff"
                              : "1px solid #e8e8e8",
                            transition: "all 0.2s ease"
                          }}
                        >
                          <img
                            src={getImageUrl(image)}
                            alt={`Thumbnail ${index}`}
                            style={{
                              width: "100%",
                              height: 70,
                              objectFit: "cover",
                              display: "block"
                            }}
                          />
                        </div>
                      </Col>
                    ))
                  ) : (
                    <Col span={24}>
                      <div style={{ 
                        textAlign: "center", 
                        padding: 30, 
                        background: "#f5f5f5", 
                        borderRadius: 8,
                        border: "1px dashed #d9d9d9"
                      }}>
                        <Text type="secondary">Chưa có hình ảnh</Text>
                      </div>
                    </Col>
                  )}
                </Row>

                {/* 360 Button */}
                <Button
                  type="primary"
                  icon={<SyncOutlined />}
                  onClick={() => setViewer360Open(true)}
                  size="large"
                  style={{
                    width: "100%",
                    height: 48,
                    borderRadius: 8,
                    fontSize: 15,
                    fontWeight: 500,
                    marginTop: 16
                  }}
                >
                  Xem phòng 360°
                </Button>
              </div>
              {/* Assets List under images */}
              <div
                style={{
                  background: "#fff",
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 16,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                  border: "1px solid #f0f0f0",
                }}
              >
                <Title level={4} style={{ marginBottom: 12, fontWeight: 500 }}>
                  Danh sách tài sản
                </Title>
                {roomAssetsLoading ? (
                  <div style={{ textAlign: "center", padding: 20 }}>
                    <Spin />
                  </div>
                ) : roomAssets && roomAssets.length > 0 ? (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {roomAssets.map((item) => (
                      <Tag
                        key={item.id || `${item.assetId}-${item.assetName}`}
                        color="blue"
                        style={{
                          margin: 0,
                          padding: "4px 8px",
                          borderRadius: 4,
                          fontSize: 12,
                          fontWeight: 400,
                        }}
                      >
                        {(item.assetName || item.name || `Tài sản #${item.assetId}`)}
                      </Tag>
                    ))}
                  </div>
                ) : (
                  <Text type="secondary">Chưa có tài sản</Text>
                )}
              </div>
            </Col>

            {/* Right Column - Info */}
            <Col xs={24} lg={10}>
              <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                {/* Room Details */}
                <div
                  style={{
                    background: "#fff",
                    borderRadius: 12,
                    padding: 20,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                    border: "1px solid #f0f0f0"
                  }}
                >
                  <Title level={4} style={{ marginBottom: 16, fontWeight: 500 }}>
                    Chi tiết phòng
                  </Title>

                  <Space direction="vertical" size="small" style={{ width: "100%" }}>
                    <div style={{ 
                      display: "flex", 
                      justifyContent: "space-between", 
                      padding: "8px 0",
                      borderBottom: "1px solid #f5f5f5"
                    }}>
                      <Text style={{ fontWeight: 400 }}>Giá thuê:</Text>
                      <Text style={{ color: "#52c41a", fontWeight: 500 }}>
                        {room.pricePerMonth?.toLocaleString()} VND
                      </Text>
                    </div>

                    <div style={{ 
                      display: "flex", 
                      justifyContent: "space-between", 
                      padding: "8px 0",
                      borderBottom: "1px solid #f5f5f5"
                    }}>
                      <Text style={{ fontWeight: 400 }}>Diện tích:</Text>
                      <Text style={{ fontWeight: 400 }}>{room.area} m²</Text>
                    </div>

                    <div style={{ 
                      display: "flex", 
                      justifyContent: "space-between", 
                      padding: "8px 0",
                      borderBottom: "1px solid #f5f5f5"
                    }}>
                      <Text style={{ fontWeight: 400 }}>Phòng ngủ:</Text>
                      <Text style={{ fontWeight: 400 }}>{room.numberOfBedrooms}</Text>
                    </div>

                    <div style={{ 
                      display: "flex", 
                      justifyContent: "space-between", 
                      padding: "8px 0"
                    }}>
                      <Text style={{ fontWeight: 400 }}>Phòng tắm:</Text>
                      <Text style={{ fontWeight: 400 }}>{room.numberOfBathrooms}</Text>
                    </div>
                  </Space>
                </div>

                {/* Description */}
                {room.description && (
                  <div
                    style={{
                      background: "#fff",
                      borderRadius: 12,
                      padding: 20,
                      boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                      border: "1px solid #f0f0f0"
                    }}
                  >
                    <Title level={4} style={{ marginBottom: 12, fontWeight: 500 }}>
                      Mô tả
                    </Title>
                    <Text style={{ fontSize: 14, lineHeight: 1.6, color: "#666", fontWeight: 400 }}>
                      {room.description}
                    </Text>
                  </div>
                )}

                {/* Contact */}
                <div
                  style={{
                    background: "#fff",
                    borderRadius: 12,
                    padding: 20,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                    border: "1px solid #f0f0f0"
                  }}
                >
                  <Title level={4} style={{ marginBottom: 16, fontWeight: 500 }}>
                    Thông tin liên hệ
                  </Title>

                  <Space direction="vertical" size="small" style={{ width: "100%" }}>
                    <div style={{ 
                      display: "flex", 
                      justifyContent: "space-between",
                      padding: "8px 0",
                      borderBottom: "1px solid #f5f5f5"
                    }}>
                      <Text style={{ fontWeight: 400 }}>Chủ nhà:</Text>
                      <Text style={{ fontWeight: 400 }}>{room.landlordName || "Chưa cập nhật"}</Text>
                    </div>
                    <div style={{ 
                      display: "flex", 
                      justifyContent: "space-between",
                      padding: "8px 0"
                    }}>
                      <Text style={{ fontWeight: 400 }}>Điện thoại:</Text>
                      <Text style={{ fontWeight: 400, color: "#1890ff" }}>
                        {room.landlordPhone || "Chưa cập nhật"}
                      </Text>
                    </div>
                  </Space>
                </div>

                {/* Services (Ẩn mục Nội thất theo yêu cầu) */}
                {(room.services?.length > 0) && (
                  <div
                    style={{
                      background: "#fff",
                      borderRadius: 12,
                      padding: 20,
                      boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                      border: "1px solid #f0f0f0"
                    }}
                  >
                    {room.services?.length > 0 && (
                      <div>
                        <Title level={4} style={{ marginBottom: 12, fontWeight: 500 }}>
                          Dịch vụ
                        </Title>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {room.services.map((service, index) => (
                            <Tag
                              key={index}
                              color="blue"
                              style={{
                                margin: 0,
                                padding: "4px 8px",
                                borderRadius: 4,
                                fontSize: 12,
                                fontWeight: 400
                              }}
                            >
                              {service.serviceName}
                            </Tag>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Booking Button */}
                {(() => {
                  console.log("Debug - user:", user);
                  console.log("Debug - user role:", user?.role);
                  
                  if (!user) {
                    // Người dùng chưa đăng nhập - hiển thị nút đăng nhập
                    return (
                      <Button
                        type="primary"
                        size="large"
                        onClick={() => setLoginModalOpen(true)}
                        style={{
                          width: "100%",
                          height: 48,
                          borderRadius: 8,
                          fontSize: 15,
                          fontWeight: 500
                        }}
                      >
                        Đăng nhập để đặt lịch hẹn
                      </Button>
                    );
                  }
                  
                  // Kiểm tra role của người dùng đã đăng nhập
                  const roleName = user?.role?.roleName || user?.role || "";
                  const normalizedRole = (roleName || "").toUpperCase().trim();
                  console.log("Debug - roleName:", roleName);
                  console.log("Debug - normalizedRole:", normalizedRole);
                  
                  // Chỉ hiển thị cho RENTER và USER
                  if (["RENTER", "USER"].includes(normalizedRole)) {
                    return (
                      <Button
                        type="primary"
                        size="large"
                        onClick={handleBookingClick}
                        loading={checkingPersonalInfo}
                        style={{
                          width: "100%",
                          height: 48,
                          borderRadius: 8,
                          fontSize: 15,
                          fontWeight: 500
                        }}
                      >
                        Đặt lịch hẹn xem phòng
                      </Button>
                    );
                  }
                  
                  // Không hiển thị cho ADMIN, SUBADMIN, LANDLORD
                  console.log("Debug - Không hiển thị nút cho role:", normalizedRole);
                  return null;
                })()}
              </Space>
            </Col>
          </Row>
        </div>
      </Content>

      {/* Modals */}
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
      >
        <div style={{ textAlign: "center", padding: "20px 0" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
          <Title level={4} style={{ fontWeight: 500 }}>Bạn cần đăng nhập</Title>
          <Text type="secondary" style={{ fontWeight: 400 }}>
            Vui lòng đăng nhập để đặt lịch hẹn xem phòng
          </Text>
        </div>
      </Modal>

      <Modal
        open={bookingModalOpen}
        onCancel={() => setBookingModalOpen(false)}
        footer={null}
        width={1000}
        centered
        destroyOnClose
      >
        <LandlordBookAppointmentPage
          room={room}
          user={user}
          onSuccess={() => setBookingModalOpen(false)}
          onCancel={() => setBookingModalOpen(false)}
          isPopup
        />
      </Modal>

      <Image360Viewer
        images={images360}
        visible={viewer360Open}
        onClose={() => setViewer360Open(false)}
        roomNumber={room?.roomNumber}
      />

      {/* Modal yêu cầu điền thông tin cá nhân */}
      <Modal
        open={personalInfoModalOpen}
        onCancel={() => setPersonalInfoModalOpen(false)}
        footer={null}
        centered
        closable={false}
        maskClosable={false}
      >
        <div style={{ textAlign: "center", padding: "20px 0" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📝</div>
          <Title level={4} style={{ fontWeight: 500 }}>Cần điền thông tin cá nhân</Title>
          <Text type="secondary" style={{ fontWeight: 400, display: "block", marginBottom: 24 }}>
            Để đặt lịch xem phòng, bạn cần điền đầy đủ thông tin cá nhân trước.
          </Text>
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <Button 
              onClick={() => setPersonalInfoModalOpen(false)}
              size="large"
            >
              Hủy
            </Button>
            <Button 
              type="primary" 
              size="large"
              onClick={() => {
                setPersonalInfoModalOpen(false);
                // Mở modal cập nhật thông tin cá nhân
                setIsCreate(true);
                setShowUpdateInfoModal(true);
              }}
            >
              Điền thông tin ngay
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modals cho thông tin cá nhân */}
      <UserInfoModal
        open={isInfoModalOpen}
        onClose={() => setIsInfoModalOpen(false)}
        onShowUpdateModal={(create = false, ocrData = null) => {
          setIsInfoModalOpen(false);
          setIsCreate(create);
          setShowUpdateInfoModal(true);
          setOcrData(ocrData);
        }}
      />
      <UpdateUserInfoPage
        open={showUpdateInfoModal}
        isCreate={isCreate}
        onClose={() => setShowUpdateInfoModal(false)}
        onBackToInfoModal={() => setIsInfoModalOpen(true)}
        ocrData={ocrData}
      />

      <Footer />
    </Layout>
  );
}