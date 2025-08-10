import React, { useState, useEffect } from "react";
import {
  Layout,
  Button,
  Form,
  Input,
  InputNumber,
  Select,
  Upload,
  message,
  Card,
  Row,
  Col,
  Drawer,
} from "antd";
import {
  ArrowLeftOutlined,
  UploadOutlined,
  MenuOutlined,
} from "@ant-design/icons";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import LandlordSidebar from "../../components/layout/LandlordSidebar";
import AdminSidebar from "../../components/layout/AdminSidebar";
import PageHeader from "../../components/common/PageHeader";
import { getRoomById, updateRoom } from "../../services/roomService";
import { useMediaQuery } from "react-responsive";

const { Sider, Content } = Layout;
const { Option } = Select;

export default function LandlordEditRoomPage() {
  const isMobile = useMediaQuery({ maxWidth: 768 });
  const [sidebarDrawerOpen, setSidebarDrawerOpen] = useState(false);
  const navigate = useNavigate();
  const { id } = useParams();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [hasActiveUser, setHasActiveUser] = useState(false);
  const user = useSelector((state) => state.account.user);

  useEffect(() => {
    const fetchRoom = async () => {
      setLoading(true);
      try {
        const res = await getRoomById(id);
        const room = res.result || res.data;
        
        if (room) {
          form.setFieldsValue({
            building: room.building,
            roomNumberSuffix: room.roomNumberSuffix,
            area: room.area,
            price: room.price,
            roomStatus: room.roomStatus,
            maxOccupants: room.maxOccupants,
            description: room.description,
          });
          
          // Kiểm tra xem phòng có người thuê đang hoạt động không
          setHasActiveUser(room.roomUsers && room.roomUsers.some(ru => ru.status === 'ACTIVE'));
        }
      } catch (err) {
        message.error("Không thể tải thông tin phòng");
      }
      setLoading(false);
    };
    
    if (id) {
      fetchRoom();
    }
  }, [id, form]);

  const handleUploadChange = ({ fileList: newFileList }) => {
    // Xử lý upload ảnh nếu cần
  };

  const handleFinish = async (values) => {
    try {
      await updateRoom(id, values);
      message.success("Cập nhật phòng thành công!");
      navigate("/landlord/rooms");
    } catch (err) {
      message.error(err.response?.data?.message || "Cập nhật phòng thất bại");
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
      <Layout style={{ minHeight: "100vh" }}>
        {/* Desktop Sidebar - chỉ hiển thị trên desktop */}
        {!isMobile && (
          <Sider width={220} style={{ position: 'fixed', height: '100vh', zIndex: 1000 }}>
            {user?.role?.roleName?.toUpperCase?.() === "ADMIN" ||
            user?.role?.roleName?.toUpperCase?.() === "SUBADMIN" ? (
              <AdminSidebar />
            ) : (
              <LandlordSidebar />
            )}
          </Sider>
        )}
        
        {/* Main Layout */}
        <Layout style={{ marginLeft: isMobile ? 0 : 220 }}>
          {/* Mobile Header - chỉ hiển thị trên mobile */}
          {isMobile && (
            <div style={{ 
              background: '#001529', 
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              position: 'sticky',
              top: 0,
              zIndex: 100,
              width: '100%'
            }}>
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
                  Chỉnh sửa phòng
                </div>
              </div>
              <Button
                type="text"
                icon={<MenuOutlined />}
                onClick={() => setSidebarDrawerOpen(true)}
                style={{ 
                  color: 'white',
                  fontSize: '18px'
                }}
              />
            </div>
          )}
          
          {/* Main Content */}
          <Content style={{ 
            padding: isMobile ? 16 : 24, 
            backgroundColor: '#f5f5f5', 
            minHeight: '100vh',
            width: '100%'
          }}>
            <div style={{ 
              background: 'white', 
              padding: isMobile ? 16 : 24, 
              borderRadius: 8, 
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              marginBottom: 20
            }}>
              <div style={{ marginBottom: 24 }}>
                <Button
                  icon={<ArrowLeftOutlined />}
                  onClick={() => {
                    if (
                      user?.role?.roleName?.toUpperCase?.() === "ADMIN" ||
                      user?.role?.roleName?.toUpperCase?.() === "SUBADMIN"
                    ) {
                      navigate("/admin/rooms");
                    } else {
                      navigate("/landlord/rooms");
                    }
                  }}
                  style={{ marginBottom: 16 }}
                >
                  Quay lại danh sách phòng
                </Button>
                <PageHeader title="Chỉnh sửa phòng" />
              </div>
              
              <div style={{ maxWidth: 1200, margin: '0 auto' }}>
                <div style={{ display: "flex", gap: 24, flexWrap: 'wrap', alignItems: 'stretch', justifyContent: 'center' }}>
                  <Card 
                    title="Thông tin phòng" 
                    style={{ 
                      flex: 1, 
                      minWidth: isMobile ? '100%' : '500px', 
                      textAlign: 'left', 
                      minHeight: '450px',
                      opacity: hasActiveUser ? 0.7 : 1
                    }}
                  >
                <div style={{ padding: '8px 0' }}>
                  <Form layout="vertical" form={form} onFinish={handleFinish} disabled={hasActiveUser}>
                    <Row gutter={16}>
                      <Col span={isMobile ? 24 : 12}>
                        <Form.Item
                          name="building"
                          label="Tòa"
                          rules={[{ required: true, message: "Vui lòng nhập tên tòa" }]}
                        >
                          <Select placeholder="Chọn tòa">
                            <Option value="A">A</Option>
                            <Option value="B">B</Option>
                          </Select>
                        </Form.Item>
                      </Col>
                      <Col span={isMobile ? 24 : 12}>
                        <Form.Item
                          name="roomNumberSuffix"
                          label="Số phòng"
                          rules={[{ required: true, message: "Vui lòng nhập số phòng (chỉ gồm số)" }]}
                        >
                          <InputNumber placeholder="Ví dụ: 101" style={{ width: '100%' }} min={1} step={1} stringMode={false} />
                        </Form.Item>
                      </Col>
                      <Col span={isMobile ? 24 : 12}>
                        <Form.Item
                          name="area"
                          label="Diện tích (m²)"
                          rules={[{ required: true, message: "Vui lòng nhập diện tích" }]}
                        >
                          <InputNumber min={1} max={1000} style={{ width: "100%" }} />
                        </Form.Item>
                      </Col>
                      <Col span={isMobile ? 24 : 12}>
                        <Form.Item
                          name="price"
                          label="Giá (VND/tháng)"
                          rules={[{ required: true, message: "Vui lòng nhập giá" }]}
                        >
                          <InputNumber min={0} style={{ width: "100%" }} />
                        </Form.Item>
                      </Col>
                      <Col span={isMobile ? 24 : 12}>
                        <Form.Item
                          name="roomStatus"
                          label="Trạng thái phòng"
                          rules={[{ required: true, message: "Vui lòng chọn trạng thái" }]}
                        >
                          <Select>
                            <Option value="AVAILABLE">Còn trống</Option>
                            <Option value="OCCUPIED">Đã thuê</Option>
                            <Option value="MAINTENANCE">Bảo trì</Option>
                          </Select>
                        </Form.Item>
                      </Col>
                      <Col span={isMobile ? 24 : 12}>
                        <Form.Item
                          name="maxOccupants"
                          label="Số người tối đa"
                          rules={[{ required: true, message: "Vui lòng nhập số người tối đa" }]}
                        >
                          <InputNumber min={1} max={10} style={{ width: "100%" }} />
                        </Form.Item>
                      </Col>
                      <Col span={24}>
                        <Form.Item
                          name="description"
                          label="Mô tả"
                        >
                          <Input.TextArea rows={4} />
                        </Form.Item>
                      </Col>
                    </Row>
                    
                    <Form.Item>
                      <Button type="primary" htmlType="submit" loading={loading} disabled={hasActiveUser}>
                        Cập nhật phòng
                      </Button>
                    </Form.Item>
                  </Form>
                </div>
              </Card>
              
              <Card 
                title="Hình ảnh phòng" 
                style={{ 
                  flex: 1, 
                  minWidth: isMobile ? '100%' : '500px', 
                  textAlign: 'left',
                  minHeight: '450px'
                }}
              >
                <Upload
                  listType="picture-card"
                  fileList={[]}
                  onChange={handleUploadChange}
                  disabled={hasActiveUser}
                >
                  <div>
                    <UploadOutlined />
                    <div style={{ marginTop: 8 }}>Tải lên</div>
                  </div>
                </Upload>
                  </Card>
                </div>
              </div>
            </div>
          </Content>
        </Layout>
        
        {/* Mobile Drawer cho Sidebar */}
        {isMobile && (
          <Drawer
            title="Menu"
            placement="left"
            onClose={() => setSidebarDrawerOpen(false)}
            open={sidebarDrawerOpen}
            width={280}
            bodyStyle={{ padding: 0 }}
          >
            {user?.role?.roleName?.toUpperCase?.() === "ADMIN" ||
            user?.role?.roleName?.toUpperCase?.() === "SUBADMIN" ? (
              <AdminSidebar isDrawer={true} onMenuClick={() => setSidebarDrawerOpen(false)} />
            ) : (
              <LandlordSidebar isDrawer={true} onMenuClick={() => setSidebarDrawerOpen(false)} />
            )}
          </Drawer>
        )}
      </Layout>
    </div>
  );
}
