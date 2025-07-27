import React, { useEffect, useState } from "react";
import { Card, Row, Col, Statistic, Spin, message, Drawer, Button } from "antd";
import { MenuOutlined } from "@ant-design/icons";
import LandlordSidebar from "../../components/layout/LandlordSidebar";
import { getRoomStats, getAllRooms } from "../../services/roomService";
import { getAllContracts } from "../../services/contractApi";
import { getBillStats, getAllBills } from "../../services/billApi";
import dayjs from "dayjs";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useMediaQuery } from "react-responsive";

const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884d8",
  "#82ca9d",
];

const LandlordDashboardPage = () => {
  const isMobile = useMediaQuery({ maxWidth: 768 });
  const isTablet = useMediaQuery({ minWidth: 769, maxWidth: 1024 });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [roomStats, setRoomStats] = useState({
    total: 0,
    rented: 0,
    available: 0,
  });
  const [contractStats, setContractStats] = useState({
    active: 0,
    expiring: 0,
  });
  const [billStats, setBillStats] = useState({
    revenue: 0,
    monthRevenue: 0,
    unpaid: 0,
    overdue: 0,
  });
  const [billStatusPie, setBillStatusPie] = useState([]);
  const [roomPie, setRoomPie] = useState([]);
  const [revenueByMonth, setRevenueByMonth] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Phòng
        const resRooms = await getAllRooms(0, 1000);
        const rooms = resRooms?.result || [];
        const rented = rooms.filter((r) => r.hasActiveContract).length;
        const available = rooms.length - rented;
        setRoomStats({ total: rooms.length, rented, available });
        setRoomPie([
          { name: "Đang cho thuê", value: rented },
          { name: "Còn trống", value: available },
        ]);

        // Hợp đồng
        let active = 0,
          expiring = 0;
        const resContracts = await getAllContracts({ page: 0, size: 1000 });
        const contracts = resContracts?.result || [];
        const now = dayjs();
        active = contracts.filter((c) => c.contractStatus === "ACTIVE").length;
        expiring = contracts.filter(
          (c) =>
            c.contractStatus === "ACTIVE" &&
            c.contractEndDate &&
            dayjs(c.contractEndDate).diff(now, "day") <= 7
        ).length;
        setContractStats({ active, expiring });

        // Hóa đơn - lấy tổng hợp từ API mới
        const stats = await getBillStats();
        setBillStats({
          unpaid: stats.unpaid || 0,
          overdue: stats.overdue || 0,
          paid: stats.paid || 0,
          total: (stats.unpaid || 0) + (stats.overdue || 0) + (stats.paid || 0),
          revenue: stats.revenue || 0,
          monthRevenue: stats.monthRevenue || 0,
        });
        // Biểu đồ doanh thu 6 tháng gần nhất
        setRevenueByMonth(
          (stats.revenueByMonth || []).map(item => ({
            month: item.month,
            revenue: item.revenue
          }))
        );
        setBillStatusPie([
          { name: "Đã thanh toán", value: stats.paid },
          { name: "Chưa thanh toán", value: stats.unpaid },
          { name: "Quá hạn", value: stats.overdue },
        ]);
      } catch (err) {
        console.error("Dashboard error:", err, err?.response?.data);
        message.error("Lỗi khi tải dữ liệu thống kê");
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  if (loading) return <Spin size="large" style={{ marginTop: 100 }} />;

  // Responsive breakpoints
  const statsColSpan = isMobile ? 24 : isTablet ? 8 : 6;
  const chartColSpan = isMobile ? 24 : isTablet ? 12 : 8;

  return (
    <div style={{ display: "flex", minHeight: "100vh", flexDirection: "column" }}>
      {/* Mobile Header */}
      {isMobile && (
        <div style={{
          background: "#001529",
          color: "white",
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)"
        }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <Button
              type="text"
              icon={<MenuOutlined />}
              onClick={() => setMobileMenuOpen(true)}
              style={{ color: "white", marginRight: "12px" }}
            />
            <span style={{ fontSize: "18px", fontWeight: "600" }}>MP-BHMS</span>
          </div>
          <span style={{ fontSize: "16px", fontWeight: "500" }}>Tổng quan</span>
        </div>
      )}

      {/* Mobile Menu Drawer */}
      {isMobile && (
        <Drawer
          title="Menu"
          placement="left"
          onClose={() => setMobileMenuOpen(false)}
          open={mobileMenuOpen}
          width={280}
          bodyStyle={{ padding: 0 }}
        >
          <LandlordSidebar />
        </Drawer>
      )}

      {/* Main Content */}
      <div style={{ display: "flex", flex: 1, flexDirection: isMobile ? "column" : "row" }}>
        {/* Desktop Sidebar */}
        {!isMobile && (
          <div
            style={{
              minWidth: 220,
              background: "#fff",
              borderRight: "1px solid #eee",
            }}
          >
            <LandlordSidebar />
          </div>
        )}
        
        {/* Content Area */}
        <div style={{ 
          flex: 1, 
          padding: isMobile ? "16px" : 24,
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
                fontSize: "32px", 
                marginBottom: "20px",
                fontWeight: "600",
                color: "#1a1a1a"
              }}>
                Tổng quan
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
                  title={<span style={{ fontSize: isMobile ? "14px" : "16px", color: "#666" }}>Tổng số phòng</span>}
                  value={roomStats.total}
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
                  Đang cho thuê: {roomStats.rented} / Còn trống: {roomStats.available}
                </div>
              </Card>
            </Col>
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
                  title={<span style={{ fontSize: isMobile ? "14px" : "16px", color: "#666" }}>Hợp đồng đang hiệu lực</span>}
                  value={contractStats.active}
                  valueStyle={{ 
                    fontSize: isMobile ? "24px" : "28px",
                    fontWeight: "600",
                    color: "#52c41a"
                  }}
                />
              </Card>
            </Col>
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
                  title={<span style={{ fontSize: isMobile ? "14px" : "16px", color: "#666" }}>Doanh thu</span>}
                  value={billStats.revenue}
                  suffix="₫"
                  valueStyle={{ 
                    fontSize: isMobile ? "24px" : "28px",
                    fontWeight: "600",
                    color: "#fa8c16"
                  }}
                />
                <div style={{ 
                  fontSize: isMobile ? "12px" : "14px", 
                  color: "#888",
                  marginTop: "8px"
                }}>
                  Tháng này: {billStats.monthRevenue} ₫
                </div>
              </Card>
            </Col>
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
                  title={<span style={{ fontSize: isMobile ? "14px" : "16px", color: "#666" }}>Tổng số hóa đơn</span>}
                  value={billStats.total}
                  valueStyle={{ 
                    fontSize: isMobile ? "24px" : "28px",
                    fontWeight: "600",
                    color: "#722ed1"
                  }}
                />
              </Card>
            </Col>
          </Row>

          {/* Charts */}
          <Row gutter={[isMobile ? 8 : 16, isMobile ? 8 : 16]} style={{ marginBottom: isMobile ? "16px" : "24px" }}>
            <Col span={chartColSpan}>
              <Card 
                title={<span style={{ fontSize: isMobile ? "16px" : "18px", fontWeight: "600" }}>Tỉ lệ phòng cho thuê</span>}
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
                      data={roomPie}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={isMobile ? 70 : 80}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {roomPie.map((entry, index) => (
                        <Cell
                          key={`cell-room-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
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
                title={<span style={{ fontSize: isMobile ? "16px" : "18px", fontWeight: "600" }}>Doanh thu 6 tháng gần nhất</span>}
                style={{ 
                  borderRadius: "8px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                  border: "none"
                }}
                bodyStyle={{ padding: isMobile ? "16px" : "24px" }}
              >
                <ResponsiveContainer width="100%" height={isMobile ? 250 : 280}>
                  <BarChart data={revenueByMonth}>
                    <XAxis 
                      dataKey="month" 
                      fontSize={isMobile ? 12 : 14}
                      angle={isMobile ? -45 : 0}
                      textAnchor={isMobile ? "end" : "middle"}
                      height={isMobile ? 60 : 40}
                    />
                    <YAxis fontSize={isMobile ? 12 : 14} />
                    <Tooltip 
                      formatter={(value) => [`${value} ₫`, 'Doanh thu']}
                      labelStyle={{ fontSize: isMobile ? 12 : 14 }}
                    />
                    <Bar dataKey="revenue" fill="#8884d8" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </Col>
            <Col span={chartColSpan}>
              <Card 
                title={<span style={{ fontSize: isMobile ? "16px" : "18px", fontWeight: "600" }}>Trạng thái hóa đơn</span>}
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
                      data={billStatusPie}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={isMobile ? 70 : 80}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {billStatusPie.map((entry, index) => (
                        <Cell
                          key={`cell-bill-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
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
          </Row>

          {/* Additional Stats */}
          <Row gutter={[isMobile ? 8 : 16, isMobile ? 8 : 16]}>
            <Col span={isMobile ? 24 : 6}>
              <Card 
                style={{ 
                  borderRadius: "8px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                  border: "none"
                }}
                bodyStyle={{ padding: isMobile ? "16px" : "24px" }}
              >
                <Statistic
                  title={<span style={{ fontSize: isMobile ? "14px" : "16px", color: "#666" }}>Hợp đồng sắp hết hạn (7 ngày)</span>}
                  value={contractStats.expiring}
                  valueStyle={{ 
                    fontSize: isMobile ? "24px" : "28px",
                    fontWeight: "600",
                    color: "#ff4d4f"
                  }}
                />
              </Card>
            </Col>
          </Row>
        </div>
      </div>
    </div>
  );
};

export default LandlordDashboardPage;
