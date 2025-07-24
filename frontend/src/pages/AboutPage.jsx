import React from "react";
import { Card, Row, Col, Typography, Divider, Space, Button } from "antd";
import { useNavigate } from "react-router-dom";
import { 
  HomeOutlined, 
  UserOutlined, 
  FileTextOutlined, 
  DollarOutlined,
  PhoneOutlined,
  MailOutlined,
  EnvironmentOutlined,
  TeamOutlined,
  SafetyOutlined,
  ClockCircleOutlined,
  ArrowLeftOutlined
} from "@ant-design/icons";

const { Title, Paragraph, Text } = Typography;

const AboutPage = () => {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: "100vh", background: "#f5f5f5" }}>
      {/* Header */}
      <div style={{ 
        background: "linear-gradient(135deg, #1890ff 0%, #722ed1 100%)", 
        color: "white", 
        padding: "60px 0",
        textAlign: "center",
        position: "relative"
      }}>
        <div style={{ 
          position: "absolute", 
          top: 20, 
          left: 24, 
          zIndex: 10 
        }}>
          <Button 
            type="primary" 
            icon={<ArrowLeftOutlined />} 
            onClick={() => navigate("/home")}
            style={{ 
              background: "rgba(255,255,255,0.2)", 
              border: "1px solid rgba(255,255,255,0.3)",
              color: "white"
            }}
          >
            Quay về trang chủ
          </Button>
        </div>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
          <Title level={1} style={{ color: "white", marginBottom: 16 }}>
            MP-BHMS
          </Title>
          <Title level={3} style={{ color: "white", fontWeight: "normal", marginBottom: 8 }}>
            Hệ thống Quản lý Nhà trọ Minh Phương
          </Title>
          <Paragraph style={{ color: "white", fontSize: 18, marginBottom: 0 }}>
            Giải pháp quản lý nhà trọ hiện đại, tiện lợi và hiệu quả
          </Paragraph>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 24px" }}>
        
        {/* Giới thiệu */}
        <Card style={{ marginBottom: 40 }}>
          <Title level={2} style={{ textAlign: "center", marginBottom: 32 }}>
            Về chúng tôi
          </Title>
          <Row gutter={[32, 32]}>
            <Col xs={24} lg={12}>
              <Paragraph style={{ fontSize: 16, lineHeight: 1.8 }}>
                MP-BHMS (MinhPhuong Boarding House Management System) là hệ thống quản lý nhà trọ 
                được phát triển bởi đội ngũ kỹ thuật giàu kinh nghiệm. Hệ thống được thiết kế để 
                đáp ứng nhu cầu quản lý hiện đại của các chủ nhà trọ và trải nghiệm thuê trọ 
                thuận tiện cho người thuê.
              </Paragraph>
              <Paragraph style={{ fontSize: 16, lineHeight: 1.8 }}>
                Với giao diện thân thiện, tính năng đầy đủ và bảo mật cao, MP-BHMS giúp 
                tự động hóa các quy trình quản lý, tiết kiệm thời gian và nâng cao hiệu quả 
                kinh doanh cho chủ nhà trọ.
              </Paragraph>
            </Col>
            <Col xs={24} lg={12}>
              <div style={{ 
                background: "linear-gradient(135deg, #f0f8ff 0%, #e6f7ff 100%)", 
                padding: 32, 
                borderRadius: 12,
                textAlign: "center"
              }}>
                <TeamOutlined style={{ fontSize: 48, color: "#1890ff", marginBottom: 16 }} />
                <Title level={4}>Đội ngũ phát triển</Title>
                <Paragraph>
                  Được phát triển bởi đội ngũ kỹ thuật trẻ, năng động với nhiều năm kinh nghiệm 
                  trong lĩnh vực công nghệ thông tin và quản lý bất động sản.
                </Paragraph>
              </div>
            </Col>
          </Row>
        </Card>

        {/* Tính năng chính */}
        <Card style={{ marginBottom: 40 }}>
          <Title level={2} style={{ textAlign: "center", marginBottom: 32 }}>
            Tính năng chính
          </Title>
          <Row gutter={[24, 24]}>
            <Col xs={24} sm={12} lg={8}>
              <Card 
                hoverable 
                style={{ textAlign: "center", height: "100%" }}
                bodyStyle={{ padding: 24 }}
              >
                <HomeOutlined style={{ fontSize: 48, color: "#1890ff", marginBottom: 16 }} />
                <Title level={4}>Quản lý phòng trọ</Title>
                <Paragraph>
                  Quản lý thông tin phòng trọ, trạng thái, giá cả và các tiện ích đi kèm một cách 
                  chi tiết và dễ dàng.
                </Paragraph>
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={8}>
              <Card 
                hoverable 
                style={{ textAlign: "center", height: "100%" }}
                bodyStyle={{ padding: 24 }}
              >
                <UserOutlined style={{ fontSize: 48, color: "#52c41a", marginBottom: 16 }} />
                <Title level={4}>Quản lý người thuê</Title>
                <Paragraph>
                  Theo dõi thông tin người thuê, lịch sử thuê trọ và quản lý hồ sơ một cách 
                  có hệ thống.
                </Paragraph>
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={8}>
              <Card 
                hoverable 
                style={{ textAlign: "center", height: "100%" }}
                bodyStyle={{ padding: 24 }}
              >
                <FileTextOutlined style={{ fontSize: 48, color: "#fa8c16", marginBottom: 16 }} />
                <Title level={4}>Quản lý hợp đồng</Title>
                <Paragraph>
                  Tạo và quản lý hợp đồng thuê trọ, theo dõi thời hạn và tự động nhắc nhở 
                  khi sắp hết hạn.
                </Paragraph>
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={8}>
              <Card 
                hoverable 
                style={{ textAlign: "center", height: "100%" }}
                bodyStyle={{ padding: 24 }}
              >
                <DollarOutlined style={{ fontSize: 48, color: "#f5222d", marginBottom: 16 }} />
                <Title level={4}>Quản lý hóa đơn</Title>
                <Paragraph>
                  Tạo hóa đơn tự động, theo dõi thanh toán và báo cáo doanh thu chi tiết 
                  theo thời gian.
                </Paragraph>
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={8}>
              <Card 
                hoverable 
                style={{ textAlign: "center", height: "100%" }}
                bodyStyle={{ padding: 24 }}
              >
                <SafetyOutlined style={{ fontSize: 48, color: "#722ed1", marginBottom: 16 }} />
                <Title level={4}>Bảo mật cao</Title>
                <Paragraph>
                  Hệ thống bảo mật đa lớp, mã hóa dữ liệu và phân quyền truy cập chi tiết 
                  để bảo vệ thông tin.
                </Paragraph>
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={8}>
              <Card 
                hoverable 
                style={{ textAlign: "center", height: "100%" }}
                bodyStyle={{ padding: 24 }}
              >
                <ClockCircleOutlined style={{ fontSize: 48, color: "#13c2c2", marginBottom: 16 }} />
                <Title level={4}>Hoạt động 24/7</Title>
                <Paragraph>
                  Hệ thống hoạt động liên tục, hỗ trợ truy cập mọi lúc mọi nơi để quản lý 
                  nhà trọ hiệu quả.
                </Paragraph>
              </Card>
            </Col>
          </Row>
        </Card>

        {/* Lợi ích */}
        <Card style={{ marginBottom: 40 }}>
          <Title level={2} style={{ textAlign: "center", marginBottom: 32 }}>
            Lợi ích khi sử dụng MP-BHMS
          </Title>
          <Row gutter={[32, 32]}>
            <Col xs={24} md={8}>
              <div style={{ textAlign: "center", padding: 24 }}>
                <div style={{ 
                  width: 80, 
                  height: 80, 
                  borderRadius: "50%", 
                  background: "linear-gradient(135deg, #1890ff 0%, #722ed1 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 16px"
                }}>
                  <Text style={{ color: "white", fontSize: 24, fontWeight: "bold" }}>50%</Text>
                </div>
                <Title level={4}>Tiết kiệm thời gian</Title>
                <Paragraph>
                  Tự động hóa các quy trình quản lý giúp tiết kiệm 50% thời gian so với 
                  phương pháp thủ công.
                </Paragraph>
              </div>
            </Col>
            <Col xs={24} md={8}>
              <div style={{ textAlign: "center", padding: 24 }}>
                <div style={{ 
                  width: 80, 
                  height: 80, 
                  borderRadius: "50%", 
                  background: "linear-gradient(135deg, #52c41a 0%, #13c2c2 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 16px"
                }}>
                  <Text style={{ color: "white", fontSize: 24, fontWeight: "bold" }}>100%</Text>
                </div>
                <Title level={4}>Chính xác tuyệt đối</Title>
                <Paragraph>
                  Loại bỏ hoàn toàn sai sót trong tính toán, báo cáo và quản lý dữ liệu.
                </Paragraph>
              </div>
            </Col>
            <Col xs={24} md={8}>
              <div style={{ textAlign: "center", padding: 24 }}>
                <div style={{ 
                  width: 80, 
                  height: 80, 
                  borderRadius: "50%", 
                  background: "linear-gradient(135deg, #fa8c16 0%, #f5222d 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 16px"
                }}>
                  <Text style={{ color: "white", fontSize: 24, fontWeight: "bold" }}>30%</Text>
                </div>
                <Title level={4}>Tăng doanh thu</Title>
                <Paragraph>
                  Quản lý hiệu quả giúp tăng 30% doanh thu thông qua tối ưu hóa quy trình 
                  và giảm chi phí vận hành.
                </Paragraph>
              </div>
            </Col>
          </Row>
        </Card>

        {/* Thông tin liên hệ */}
        <Card>
          <Title level={2} style={{ textAlign: "center", marginBottom: 32 }}>
            Thông tin liên hệ
          </Title>
          <Row gutter={[32, 32]}>
            <Col xs={24} md={12}>
              <div style={{ 
                background: "linear-gradient(135deg, #f0f8ff 0%, #e6f7ff 100%)", 
                padding: 32, 
                borderRadius: 12 
              }}>
                <Title level={3} style={{ marginBottom: 24 }}>Liên hệ với chúng tôi</Title>
                <Space direction="vertical" size="large" style={{ width: "100%" }}>
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <PhoneOutlined style={{ fontSize: 20, color: "#1890ff", marginRight: 12 }} />
                    <div>
                      <Text strong>Điện thoại:</Text>
                      <br />
                      <Text>+84 123 456 789</Text>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <MailOutlined style={{ fontSize: 20, color: "#1890ff", marginRight: 12 }} />
                    <div>
                      <Text strong>Email:</Text>
                      <br />
                      <Text>info@mpbhms.com</Text>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <EnvironmentOutlined style={{ fontSize: 20, color: "#1890ff", marginRight: 12 }} />
                    <div>
                      <Text strong>Địa chỉ:</Text>
                      <br />
                      <Text>Thôn 2 Thạch Hoà, Thạch Thất HN</Text>
                    </div>
                  </div>
                </Space>
              </div>
            </Col>
            <Col xs={24} md={12}>
              <div style={{ 
                background: "linear-gradient(135deg, #fff7e6 0%, #fff2e8 100%)", 
                padding: 32, 
                borderRadius: 12 
              }}>
                <Title level={3} style={{ marginBottom: 24 }}>Hỗ trợ khách hàng</Title>
                <Paragraph style={{ fontSize: 16, lineHeight: 1.8 }}>
                  Đội ngũ hỗ trợ khách hàng của chúng tôi luôn sẵn sàng hỗ trợ bạn 24/7. 
                  Liên hệ ngay để được tư vấn và hỗ trợ tốt nhất.
                </Paragraph>
                <Space>
                  <Button type="primary" size="large">
                    Liên hệ ngay
                  </Button>
                  <Button size="large">
                    Tài liệu hướng dẫn
                  </Button>
                </Space>
              </div>
            </Col>
          </Row>
        </Card>
      </div>

      {/* Footer */}
      <div style={{ 
        background: "#001529", 
        color: "white", 
        padding: "40px 0", 
        marginTop: 60,
        textAlign: "center"
      }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
          <Paragraph style={{ color: "white", marginBottom: 16 }}>
            © 2024 MP-BHMS. Tất cả quyền được bảo lưu.
          </Paragraph>
          <Paragraph style={{ color: "rgba(255,255,255,0.65)", marginBottom: 0 }}>
            Hệ thống Quản lý Nhà trọ Minh Phương - Giải pháp quản lý nhà trọ hiện đại
          </Paragraph>
        </div>
      </div>
    </div>
  );
};

export default AboutPage; 