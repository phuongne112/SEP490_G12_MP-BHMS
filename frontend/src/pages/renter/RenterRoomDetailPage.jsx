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
} from "antd";
import { useNavigate } from "react-router-dom";
import RenterSidebar from "../../components/layout/RenterSidebar";
import PageHeader from "../../components/common/PageHeader";
import { getMyRoom } from "../../services/roomService";
import { getAllAssets, getAssetsByRoomId } from "../../services/assetApi";
import { BACKEND_URL } from "../../services/axiosClient";
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
        if (room && room.roomNumber) {
          const assetRes = await getAssetsByRoomId(room.roomNumber);
          setAssets(assetRes?.data?.result || []);
        }
      } catch {
        setRoomInfo(null);
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
        const assetRes = await getAssetsByRoomId(roomInfo.roomNumber);
        assetList = assetRes?.data?.result || [];
        setAssets(assetList);
      } catch {
        assetList = [];
      }
    }
    if (type === 'checkin') {
      navigate("/renter/rooms/checkin-assets", { state: { roomId: roomInfo.roomNumber, contractId: roomInfo.contract?.contractId || roomInfo.contract?.id, assets: assetList } });
    } else {
      navigate("/renter/rooms/checkout-assets", { state: { roomId: roomInfo.roomNumber, contractId: roomInfo.contract?.contractId || roomInfo.contract?.id, assets: assetList } });
    }
  };

  if (loading) {
    return <Spin style={{ margin: 40 }} />;
  }

  if (!roomInfo) {
    return (
      <Alert
        message="Bạn chưa được phân phòng. Vui lòng liên hệ quản lý để được sắp xếp phòng."
        type="warning"
        showIcon
        style={{ margin: 40 }}
      />
    );
  }

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider width={220} style={{ background: "#001529" }}>
        <RenterSidebar />
      </Sider>
      <Layout style={{ padding: 24, justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Content style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'transparent', padding: 0 }}>
          <PageHeader title="Chi tiết phòng" />

          <Card style={{ width: 950, margin: '0 auto', boxShadow: '0 2px 12px #0001', borderRadius: 12, marginBottom: 32 }} bodyStyle={{ padding: 32 }}>
            <Row gutter={32} align="top" justify="center">
              <Col span={10} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <img
                  src={getImageUrl(selectedImage)}
                  alt="Main"
                  style={{
                    width: 340,
                    height: 220,
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
                          width: 90,
                          height: 60,
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

              <Col span={14}>
                <div style={{ maxWidth: 420, margin: '0 auto' }}>
                  <div style={{ marginBottom: 16, fontSize: 16 }}>
                    <span style={{ fontWeight: 500 }}>Số phòng: </span>
                    <span>{roomInfo.roomNumber || "-"}</span>
                  </div>
                  <div style={{ marginBottom: 16, fontSize: 16 }}>
                    <span style={{ fontWeight: 500 }}>Số người tối đa: </span>
                    <span>{roomInfo.maxOccupants || "-"}</span>
                  </div>
                  <div style={{ marginBottom: 16, fontSize: 16 }}>
                    <span style={{ fontWeight: 500 }}>Tòa nhà: </span>
                    <span>{roomInfo.building || "-"}</span>
                  </div>
                  <div style={{ marginBottom: 16, fontSize: 16 }}>
                    <span style={{ fontWeight: 500 }}>Diện tích (m²): </span>
                    <span>{roomInfo.area || "-"}</span>
                  </div>
                  <div style={{ marginBottom: 16, fontSize: 16 }}>
                    <span style={{ fontWeight: 500 }}>Giá (VND/Tháng): </span>
                    <span>{roomInfo.pricePerMonth ? roomInfo.pricePerMonth.toLocaleString("vi-VN") : "-"}</span>
                  </div>
                  <div style={{ marginBottom: 16, fontSize: 16, display: 'flex', alignItems: 'center' }}>
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
                    <Col>
                      <Button
                        type="primary"
                        onClick={() => handleCheckAssets('checkin')}
                      >
                        Kiểm kê tài sản nhận phòng
                      </Button>
                    </Col>
                    <Col>
                      <Button
                        danger
                        onClick={() => handleCheckAssets('checkout')}
                      >
                        Kiểm kê tài sản trả phòng
                      </Button>
                    </Col>
                  </Row>
                </div>
              </Col>
            </Row>
          </Card>

          {/* Bạn cùng phòng */}
          <Card style={{ width: 950, margin: '0 auto', boxShadow: '0 2px 12px #0001', borderRadius: 12, marginBottom: 32 }} bodyStyle={{ padding: 24 }}>
            <Title level={5} style={{ marginBottom: 16 }}>Bạn cùng phòng</Title>
            {Array.isArray(roomInfo.roommates) && roomInfo.roommates.length > 0 ? (
              <ul style={{ paddingLeft: 20, fontSize: 16 }}>
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
              <div style={{ color: '#888', fontSize: 16 }}>Không có bạn cùng phòng.</div>
            )}
          </Card>
        </Content>
      </Layout>
    </Layout>
  );
}
