import React, { useEffect, useState } from "react";
import {
  Layout,
  Row,
  Col,
  Button,
  Form,
  Input,
  InputNumber,
  Switch,
  Typography,
  Alert,
  Spin,
  Card,
  Table,
  message,
  Drawer,
} from "antd";
import { MenuOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import RenterSidebar from "../../components/layout/RenterSidebar";
import PageHeader from "../../components/common/PageHeader";
import { getMyRoom } from "../../services/roomService";
import { getAllAssets, getAssetsByRoom, getAssetsByRoomNumber } from "../../services/assetApi";
const isDev = import.meta.env.DEV;
const BACKEND_URL = isDev
  ? (import.meta.env.VITE_BACKEND_URL || "http://localhost:8080")
  : (typeof window !== "undefined" ? window.location.origin : "");
import { useMediaQuery } from "react-responsive";
import dayjs from "dayjs";

const { Sider, Content } = Layout;
const { TextArea } = Input;
const { Title } = Typography;

// Hàm xử lý đường dẫn ảnh giống RoomDetailPage
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

export default function RenterRoomDetailPage() {
  const isMobile = useMediaQuery({ maxWidth: 768 });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const navigate = useNavigate();
  const [roomInfo, setRoomInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    async function fetchRoom() {
      setLoading(true);
      try {
        const room = await getMyRoom();
        setRoomInfo(room);
        // Lấy tài sản sử dụng roomId hoặc roomNumber
        if (room) {
          try {
            let assetRes;
            if (room.id || room.roomId) {
              const roomId = room.id || room.roomId;
              assetRes = await getAssetsByRoom(roomId);
            } else if (room.roomNumber) {
              assetRes = await getAssetsByRoomNumber(room.roomNumber);
            } else {
              setAssets([]);
              return;
            }
            setAssets(assetRes?.data || []);
          } catch (assetError) {
            console.error("Error fetching assets:", assetError);
            setAssets([]);
          }
        } else {
          setAssets([]);
        }
      } catch {
        setRoomInfo(null);
        setAssets([]);
      }
      setLoading(false);
    }
    fetchRoom();
  }, []);

  useEffect(() => {
    if (roomInfo && Array.isArray(roomInfo.images) && roomInfo.images.length > 0) {
      setSelectedImage(roomInfo.images[0]);
    }
  }, [roomInfo]);

  // Hàm lấy asset và chuyển trang
  const handleCheckAssets = async (type) => {
    let assetList = assets;
    if (!assets || assets.length === 0) {
      try {
        let assetRes;
        if (roomInfo.id || roomInfo.roomId) {
          const roomId = roomInfo.id || roomInfo.roomId;
          assetRes = await getAssetsByRoom(roomId);
        } else if (roomInfo.roomNumber) {
          assetRes = await getAssetsByRoomNumber(roomInfo.roomNumber);
        }
        if (assetRes) {
          assetList = assetRes?.data || [];
          setAssets(assetList);
        }
      } catch {
        assetList = [];
      }
    }
    const stateData = {
      contractId: roomInfo.contract?.contractId || roomInfo.contract?.id,
      assets: assetList
    };
    if (roomInfo.id || roomInfo.roomId) {
      stateData.roomId = roomInfo.id || roomInfo.roomId;
    }
    if (roomInfo.roomNumber) {
      stateData.roomNumber = roomInfo.roomNumber;
    }
    if (type === 'checkin') {
      navigate("/renter/rooms/checkin-assets", { state: stateData });
    } else {
      navigate("/renter/rooms/checkout-assets", { state: stateData });
    }
  };

  return (
    <div style={{ width: '100%', minHeight: '100vh' }}>
      <style>
        {`
          @media (max-width: 768px) {
            .ant-layout-sider {
              display: none !important;
            }
          }
        `}
      </style>
      <div style={{ display: "flex", minHeight: "100vh" }}>
        {/* Desktop Sidebar - chỉ hiển thị trên desktop */}
        {!isMobile && (
          <div
            style={{
              width: 220,
              background: "#001529",
              position: "fixed",
              height: "100vh",
              zIndex: 1000,
            }}
          >
            <RenterSidebar />
          </div>
        )}

        {/* Main Layout */}
        <div style={{ 
          flex: 1, 
          marginLeft: isMobile ? 0 : 220,
          display: "flex",
          flexDirection: "column"
        }}>
          {/* Mobile Header - chỉ hiển thị trên mobile */}
          {isMobile && (
            <div style={{ 
              background: '#001529', 
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-start',
              position: 'sticky',
              top: 0,
              zIndex: 100,
              width: '100%',
              gap: 12
            }}>
              <Button
                type="text"
                icon={<MenuOutlined />}
                onClick={() => setMobileMenuOpen(true)}
                style={{ 
                  color: 'white',
                  fontSize: '18px'
                }}
              />
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 12,
                color: 'white'
              }}>
                <div style={{ 
                  fontWeight: 600, 
                  fontSize: 18,
                  color: 'white'
                }}>
                  MP-BHMS
                </div>
                <div style={{ 
                  fontSize: 14,
                  color: 'rgba(255,255,255,0.8)'
                }}>
                  Xin chào Renter
                </div>
              </div>
            </div>
          )}
          
          {/* Content Area */}
          <div style={{ 
            flex: 1, 
            padding: isMobile ? 16 : 24,
            backgroundColor: "#f5f5f5",
            minHeight: isMobile ? "calc(100vh - 60px)" : "100vh",
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {loading ? (
              <Spin style={{ margin: 40 }} />
            ) : !roomInfo ? (
              <Alert
                message="Bạn chưa được phân phòng. Vui lòng liên hệ quản lý để được sắp xếp phòng."
                type="warning"
                showIcon
                style={{ margin: 40 }}
              />
            ) : (
              <>
                <Card style={{ 
                  width: isMobile ? '100%' : 950, 
                  margin: '0 auto', 
                  boxShadow: '0 2px 12px #0001', 
                  borderRadius: 12, 
                  marginBottom: 32 
                }} bodyStyle={{ padding: isMobile ? 16 : 32 }}>
                  {/* Page Title - Inside the card */}
                  <div style={{ 
                    textAlign: 'center', 
                    marginBottom: isMobile ? 16 : 24,
                    fontSize: isMobile ? 18 : 20,
                    fontWeight: 'bold',
                    color: '#1890ff'
                  }}>
                    Chi tiết phòng
                  </div>
                  <Row gutter={isMobile ? 16 : 32} align="top" justify="center">
                    <Col span={isMobile ? 24 : 10} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <img
                        src={getImageUrl(selectedImage)}
                        alt="Main"
                        style={{
                          width: isMobile ? '100%' : 340,
                          height: isMobile ? 200 : 220,
                          objectFit: "cover",
                          borderRadius: 8,
                          marginBottom: 16,
                          boxShadow: '0 2px 8px #0002'
                        }}
                      />
                      <Row gutter={[8, 8]} justify="center" style={{ width: '100%' }}>
                        {roomInfo.images.map((url, index) => (
                          <Col span={8} key={index} style={{ display: 'flex', justifyContent: 'center' }}>
                            <img
                              src={getImageUrl(url)}
                              alt={`Thumb ${index}`}
                              onClick={() => setSelectedImage(url)}
                              style={{
                                width: isMobile ? 70 : 90,
                                height: isMobile ? 50 : 60,
                                objectFit: "cover",
                                border:
                                  selectedImage === url
                                    ? "2px solid #1890ff"
                                    : "1px solid #ccc",
                                borderRadius: 6,
                                cursor: "pointer",
                                boxShadow: selectedImage === url ? '0 2px 8px #1890ff33' : 'none',
                              }}
                            />
                          </Col>
                        ))}
                      </Row>
                    </Col>

                    <Col span={isMobile ? 24 : 14}>
                      <div style={{ maxWidth: isMobile ? '100%' : 420, margin: '0 auto' }}>
                        <div style={{ marginBottom: 16, fontSize: isMobile ? 14 : 16 }}>
                          <span style={{ fontWeight: 500 }}>Số phòng: </span>
                          <span>{roomInfo.roomNumber || "-"}</span>
                        </div>
                        <div style={{ marginBottom: 16, fontSize: isMobile ? 14 : 16 }}>
                          <span style={{ fontWeight: 500 }}>Số người tối đa: </span>
                          <span>{roomInfo.maxOccupants || "-"}</span>
                        </div>
                        <div style={{ marginBottom: 16, fontSize: isMobile ? 14 : 16 }}>
                          <span style={{ fontWeight: 500 }}>Tòa nhà: </span>
                          <span>{roomInfo.building || "-"}</span>
                        </div>
                        <div style={{ marginBottom: 16, fontSize: isMobile ? 14 : 16 }}>
                          <span style={{ fontWeight: 500 }}>Diện tích (m²): </span>
                          <span>{roomInfo.area || "-"}</span>
                        </div>
                        <div style={{ marginBottom: 16, fontSize: isMobile ? 14 : 16 }}>
                          <span style={{ fontWeight: 500 }}>Giá (VND/Tháng): </span>
                          <span>{roomInfo.pricePerMonth ? roomInfo.pricePerMonth.toLocaleString("vi-VN") : "-"}</span>
                        </div>
                        <div style={{ marginBottom: 16, fontSize: isMobile ? 14 : 16, display: 'flex', alignItems: 'center' }}>
                          <span style={{ fontWeight: 500, marginRight: 8 }}>Trạng thái: </span>
                          <span>
                            <span style={{
                              display: 'inline-block',
                              width: 12,
                              height: 12,
                              borderRadius: '50%',
                              background: roomInfo.status === "Available" ? '#52c41a' : '#faad14',
                              marginRight: 8
                            }} />
                            {roomInfo.status === "Available" ? "Còn trống" : "Đang sử dụng"}
                          </span>
                        </div>
                        <Row gutter={16} style={{ marginTop: 24 }}>
                          <Col span={isMobile ? 24 : 12} style={{ marginBottom: isMobile ? 8 : 0 }}>
                            <Button
                              type="primary"
                              onClick={() => handleCheckAssets('checkin')}
                              style={{ width: isMobile ? '100%' : 'auto' }}
                            >
                              Kiểm kê tài sản nhận phòng
                            </Button>
                          </Col>
                          <Col span={isMobile ? 24 : 12}>
                            <Button
                              danger
                              onClick={() => handleCheckAssets('checkout')}
                              style={{ width: isMobile ? '100%' : 'auto' }}
                            >
                              Kiểm kê tài sản trả phòng
                            </Button>
                          </Col>
                        </Row>
                      </div>
                    </Col>
                  </Row>
                  {/* Hiển thị danh sách tài sản của phòng giống landlord */}
                  <div style={{ marginTop: 32 }}>
                    <Typography.Title level={isMobile ? 4 : 5}>Danh sách tài sản của phòng</Typography.Title>
                    {assets && assets.length > 0 ? (
                      <Table
                        dataSource={assets}
                        loading={loading}
                        rowKey={row => row.id || row.assetId}
                        columns={[
                          { title: "Tên tài sản", dataIndex: "assetName", key: "assetName" },
                          { title: "Số lượng", dataIndex: "quantity", key: "quantity" },
                          { title: "Tình trạng", dataIndex: "status", key: "status" },
                          { title: "Ghi chú", dataIndex: "note", key: "note" },
                        ]}
                        pagination={false}
                        style={{ marginTop: 12 }}
                        scroll={{ x: 600 }}
                      />
                    ) : (
                      <div style={{ color: '#888', fontSize: isMobile ? 14 : 16, margin: '16px 0' }}>Không có tài sản nào trong phòng này.</div>
                    )}
                  </div>
                </Card>

                {/* Bạn cùng phòng */}
                <Card style={{ 
                  width: isMobile ? '100%' : 950, 
                  margin: '0 auto', 
                  boxShadow: '0 2px 12px #0001', 
                  borderRadius: 12, 
                  marginBottom: 32 
                }} bodyStyle={{ padding: isMobile ? 16 : 24 }}>
                  <Title level={isMobile ? 4 : 5} style={{ marginBottom: 16 }}>Bạn cùng phòng</Title>
                  {Array.isArray(roomInfo.roommates) && roomInfo.roommates.length > 0 ? (
                    <ul style={{ paddingLeft: 20, fontSize: isMobile ? 14 : 16 }}>
                      {roomInfo.roommates.map((mate, idx) => (
                        <li key={idx} style={{ marginBottom: 8 }}>
                          {mate.fullName || "(Không rõ tên)"}
                          {mate.joinedAt && (
                            <span style={{ color: '#888', marginLeft: 8 }}>
                              (vào phòng: {dayjs(mate.joinedAt).format("DD/MM/YYYY")})
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div style={{ color: '#888', fontSize: isMobile ? 14 : 16 }}>Không có bạn cùng phòng.</div>
                  )}
                </Card>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Drawer cho Sidebar */}
      {isMobile && (
        <Drawer
          title="Menu"
          placement="left"
          onClose={() => setMobileMenuOpen(false)}
          open={mobileMenuOpen}
          width={280}
          bodyStyle={{ padding: 0 }}
        >
          <RenterSidebar isDrawer={true} onMenuClick={() => setMobileMenuOpen(false)} />
        </Drawer>
      )}
    </div>
  );
}
