import React, { useEffect, useState } from "react";
import { Card, Row, Col, Statistic, Spin, message, Drawer, Button } from "antd";
import { MenuOutlined } from "@ant-design/icons";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { getUserStats } from "../../services/userApi";
import { getAssetStats } from "../../services/assetApi";
import { getBillStats } from "../../services/billApi";
import { getRoomStats } from "../../services/roomService";
import AdminSidebar from "../../components/layout/AdminSidebar";
import { useMediaQuery } from "react-responsive";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d"];

const AdminDashboardPage = () => {
  const isMobile = useMediaQuery({ maxWidth: 768 });
  const isTablet = useMediaQuery({ minWidth: 769, maxWidth: 1024 });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [userStats, setUserStats] = useState(null);
  // Chỉ giữ thống kê người dùng theo yêu cầu mới

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const users = await getUserStats();
        setUserStats(users);
      } catch (err) {
        message.error("Lỗi khi tải dữ liệu thống kê");
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  if (loading || !userStats) return <Spin size="large" style={{ marginTop: 100 }} />;

  // Chuẩn bị dữ liệu biểu đồ
  const userTypeRatio = [
    { name: "Quản trị viên", value: userStats?.admin || 0 },
    { name: "Người thuê", value: userStats?.renter || 0 },
    { name: "Khách", value: userStats?.guest || 0 },
  ];
  const accountStatusRatio = [
    { name: "Đang hoạt động", value: userStats?.active || 0 },
    { name: "Ngừng hoạt động", value: userStats?.inactive || 0 },
  ];
  const rolesOrder = ["ADMIN", "SUBADMIN", "LANDLORD", "RENTER", "GUEST"];
  const accountsPerRole = rolesOrder.map((r) => ({ role: r, count: userStats?.byRole?.[r] || 0 }));

  // Responsive breakpoints
  const statsColSpan = isMobile ? 24 : isTablet ? 8 : 6;
  const chartColSpan = isMobile ? 24 : isTablet ? 12 : 8;

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
            <AdminSidebar />
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
                <Button
                  type="text"
                  icon={<MenuOutlined />}
                  onClick={() => setMobileMenuOpen(true)}
                  style={{ 
                    color: 'white',
                    fontSize: '16px'
                  }}
                />
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
                  Xin chào Administrator
                </div>
              </div>
            </div>
          )}
          
          {/* Content Area */}
          <div style={{ 
            flex: 1, 
            padding: isMobile ? 16 : 24,
            backgroundColor: "#f5f5f5",
            minHeight: isMobile ? "calc(100vh - 60px)" : "100vh"
          }}>
            {/* Page Title - Only show on desktop */}
            {!isMobile && (
              <div style={{ 
                backgroundColor: "#fff", 
                borderRadius: "8px", 
                padding: "24px",
                marginBottom: "24px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
              }}>
                <h1 style={{ 
                  fontSize: "24px", 
                  marginBottom: "20px",
                  fontWeight: "600",
                  color: "#1a1a1a"
                }}>
                  Thống kê
                </h1>
              </div>
            )}
            
            {/* Stats Cards */}
            <Row gutter={[isMobile ? 8 : 16, isMobile ? 8 : 16]} style={{ marginBottom: isMobile ? "16px" : "24px" }}>
              <Col span={statsColSpan}>
                <Card 
                  style={{ 
                    borderRadius: "8px",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                    border: "none"
                  }}
                  bodyStyle={{ padding: isMobile ? "16px" : "24px" }}
                >
                  <Statistic 
                    title={<span style={{ fontSize: isMobile ? "14px" : "16px", color: "#666" }}>Tổng số người dùng</span>}
                    value={userStats?.total || 0}
                    valueStyle={{ 
                      fontSize: isMobile ? "24px" : "28px",
                      fontWeight: "600",
                      color: "#1890ff"
                    }}
                  />
                  <div style={{ 
                    fontSize: isMobile ? "12px" : "14px", 
                    color: "#888",
                    marginTop: "8px"
                  }}>
                    (Quản trị viên: {userStats?.admin || 0} / Người thuê: {userStats?.renter || 0} / Khách: {userStats?.guest || 0})
                  </div>
                </Card>
              </Col>
              {/* Các thẻ khác bỏ theo yêu cầu */}
            </Row>

            {/* Charts */}
            <Row gutter={[isMobile ? 8 : 16, isMobile ? 8 : 16]} style={{ marginBottom: isMobile ? "16px" : "24px" }}>
              <Col span={chartColSpan}>
                <Card 
                  title={<span style={{ fontSize: isMobile ? "16px" : "18px", fontWeight: "600" }}>Tỉ lệ loại người dùng</span>}
                  style={{ 
                    borderRadius: "8px",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                    border: "none"
                  }}
                  bodyStyle={{ padding: isMobile ? "16px" : "24px" }}
                >
                  <ResponsiveContainer width="100%" height={isMobile ? 250 : 280}>
                    <PieChart>
                      <Pie 
                        data={userTypeRatio} 
                        dataKey="value" 
                        nameKey="name" 
                        cx="50%" 
                        cy="50%" 
                        outerRadius={isMobile ? 70 : 80}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {userTypeRatio.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Legend 
                        verticalAlign="bottom" 
                        height={36}
                        wrapperStyle={{ fontSize: isMobile ? "12px" : "14px" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </Card>
              </Col>
              <Col span={chartColSpan}>
                <Card 
                  title={<span style={{ fontSize: isMobile ? "16px" : "18px", fontWeight: "600" }}>Trạng thái tài khoản</span>}
                  style={{ 
                    borderRadius: "8px",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                    border: "none"
                  }}
                  bodyStyle={{ padding: isMobile ? "16px" : "24px" }}
                >
                  <ResponsiveContainer width="100%" height={isMobile ? 250 : 280}>
                    <PieChart>
                      <Pie 
                        data={accountStatusRatio}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={isMobile ? 70 : 80}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {accountStatusRatio.map((entry, index) => (
                          <Cell key={`cell-status-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: isMobile ? "12px" : "14px" }} />
                    </PieChart>
                  </ResponsiveContainer>
                </Card>
              </Col>
              <Col span={chartColSpan}>
                <Card 
                  title={<span style={{ fontSize: isMobile ? "16px" : "18px", fontWeight: "600" }}>Số tài khoản theo cấp quyền</span>}
                  style={{ 
                    borderRadius: "8px",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                    border: "none"
                  }}
                  bodyStyle={{ padding: isMobile ? "16px" : "24px" }}
                >
                  <ResponsiveContainer width="100%" height={isMobile ? 250 : 280}>
                    <BarChart data={accountsPerRole}>
                      <XAxis 
                        dataKey="role" 
                        interval={0}
                        tickMargin={14}
                        tick={{ fontSize: isMobile ? 9 : 11 }}
                        tickLine={false}
                      />
                      <YAxis tick={{ fontSize: isMobile ? 9 : 11 }} />
                      <Tooltip formatter={(value) => [value, 'Số tài khoản']} labelStyle={{ fontSize: isMobile ? 12 : 14 }} />
                      <Bar dataKey="count" fill="#82ca9d" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>
              </Col>
            </Row>
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
          <AdminSidebar isDrawer={true} onMenuClick={() => setMobileMenuOpen(false)} />
        </Drawer>
      )}
    </div>
  );
};

export default AdminDashboardPage; 