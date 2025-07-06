import React, { useState } from "react";
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
} from "antd";
import { useNavigate } from "react-router-dom";
import RenterSidebar from "../../components/layout/RenterSidebar";
import PageHeader from "../../components/common/PageHeader";

const { Sider, Content } = Layout;
const { TextArea } = Input;
const { Title } = Typography;

export default function RenterRoomDetailPage() {
  const navigate = useNavigate();

  const roomInfo = {
    number: "203",
    building: "A",
    area: 22,
    price: 2300000,
    maxPeople: 3,
    status: true,
    // details: "Phòng rộng rãi, sạch sẽ thoáng mát...",
    images: ["/img/img1.png", "/img/img2.png"],
  };

  const [selectedImage, setSelectedImage] = useState(roomInfo.images[0]);

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider width={220} style={{ background: "#001529" }}>
        <RenterSidebar />
      </Sider>
      <Layout style={{ padding: 24 }}>
        <Content style={{ background: "#fff", padding: 24, borderRadius: 8 }}>
          <PageHeader title="Chi tiết phòng" />

          <Row gutter={24}>
            <Col span={10}>
              <img
                src={selectedImage}
                alt="Main"
                style={{
                  width: "100%",
                  height: 220,
                  objectFit: "cover",
                  borderRadius: 8,
                  marginBottom: 16,
                }}
              />
              <Row gutter={[8, 8]}>
                {roomInfo.images.map((url, index) => (
                  <Col span={8} key={index}>
                    <img
                      src={url}
                      alt={`Thumb ${index}`}
                      onClick={() => setSelectedImage(url)}
                      style={{
                        width: "100%",
                        height: 70,
                        objectFit: "cover",
                        border:
                          selectedImage === url
                            ? "2px solid #1890ff"
                            : "1px solid #ccc",
                        borderRadius: 6,
                        cursor: "pointer",
                      }}
                    />
                  </Col>
                ))}
              </Row>
            </Col>

            <Col span={14}>
              <Form
                layout="vertical"
                labelAlign="left"
                labelCol={{ span: 24 }}
                wrapperCol={{ span: 24 }}
                style={{ maxWidth: 500 }}
              >
                <Form.Item label="Số phòng">
                  <Input value={roomInfo.number} disabled />
                </Form.Item>

                <Form.Item label="Số người tối đa">
                  <InputNumber
                    value={roomInfo.maxPeople}
                    disabled
                    style={{ width: "100%" }}
                  />
                </Form.Item>

                <Form.Item label="Tòa nhà">
                  <Input value={roomInfo.building} disabled />
                </Form.Item>

                <Form.Item label="Diện tích (m²)">
                  <InputNumber
                    value={roomInfo.area}
                    disabled
                    style={{ width: "100%" }}
                  />
                </Form.Item>

                <Form.Item label="Giá (VND/Tháng)">
                  <Input
                    value={roomInfo.price.toLocaleString("vi-VN")}
                    disabled
                  />
                </Form.Item>

                <Form.Item label="Trạng thái">
                  <Switch checked={roomInfo.status} disabled />
                </Form.Item>

                <Row gutter={16} style={{ marginTop: 12 }}>
                  <Col>
                    <Button
                      type="primary"
                      onClick={() => navigate("/renter/rooms/checkin-assets")}
                    >
                      Kiểm kê tài sản nhận phòng
                    </Button>
                  </Col>
                  <Col>
                    <Button
                      danger
                      onClick={() => navigate("/renter/rooms/checkout-assets")}
                    >
                      Kiểm kê tài sản trả phòng
                    </Button>
                  </Col>
                </Row>
              </Form>
            </Col>
          </Row>
        </Content>
      </Layout>
    </Layout>
  );
}
