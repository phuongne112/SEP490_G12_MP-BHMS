import React, { useState, useEffect } from "react";
import { Card, Row, Col, Statistic, Spin, message, Drawer, Button } from "antd";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { MenuOutlined } from "@ant-design/icons";
import RenterSidebar from "../../components/layout/RenterSidebar";
import { getMyRoom } from "../../services/roomService";
import { getRenterContracts } from "../../services/contractApi";
import { getBillStats, getMyBills } from "../../services/billApi";
import { getElectricReadings } from "../../services/electricReadingApi";
import { useMediaQuery } from "react-responsive";
import dayjs from "dayjs";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

const RenterDashboardPage = () => {
  const isMobile = useMediaQuery({ maxWidth: 768 });
  const isTablet = useMediaQuery({ minWidth: 769, maxWidth: 1024 });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [room, setRoom] = useState(null);
  const [contracts, setContracts] = useState([]);
  const [bills, setBills] = useState([]);
  const [billStats, setBillStats] = useState({ unpaid: 0, overdue: 0, paid: 0, total: 0 });
  const [billStatusPie, setBillStatusPie] = useState([]);
  const [electricityData, setElectricityData] = useState([]);

  // Responsive grid spans
  const statsColSpan = isMobile ? 24 : isTablet ? 12 : 8;
  const chartColSpan = isMobile ? 24 : 12;

  // Hàm lấy dữ liệu điện theo tháng
  const fetchElectricityData = async () => {
    if (!room) return;
    
    try {
      // Lấy dữ liệu 6 tháng gần nhất
      const endDate = dayjs();
      const startDate = dayjs().subtract(6, 'month');
      
      const params = {
        serviceId: 1, // ID của service điện
        roomId: room.id || room.room?.id,
        startDate: startDate.format('YYYY-MM-DD'),
        endDate: endDate.format('YYYY-MM-DD')
      };
      
      const response = await getElectricReadings(params);
      const readings = response.data || response || [];
      
      // Nhóm dữ liệu theo tháng và tính tổng tiêu thụ
      const monthlyData = {};
      
      readings.forEach(reading => {
        const month = dayjs(reading.createdDate).format('YYYY-MM');
        const consumption = reading.newReading - reading.oldReading;
        
        if (!monthlyData[month]) {
          monthlyData[month] = {
            month: month,
            consumption: 0,
            count: 0
          };
        }
        
        if (consumption > 0) {
          monthlyData[month].consumption += consumption;
          monthlyData[month].count += 1;
        }
      });
      
      // Chuyển đổi thành array và sắp xếp theo tháng
      const chartData = Object.values(monthlyData)
        .sort((a, b) => a.month.localeCompare(b.month))
        .map(item => ({
          month: dayjs(item.month + '-01').format('MM/YYYY'),
          consumption: Math.round(item.consumption * 100) / 100, // Làm tròn 2 chữ số thập phân
          average: item.count > 0 ? Math.round((item.consumption / item.count) * 100) / 100 : 0
        }));
      
      setElectricityData(chartData);
    } catch (error) {
      console.error("Error fetching electricity data:", error);
      setElectricityData([]);
    }
  };

  const fetchData = async () => {
      setLoading(true);
      try {
        // Phòng hiện tại
        const resRoom = await getMyRoom();
        console.log("Room response:", resRoom);
        setRoom(resRoom || null);
        
        // Hợp đồng
        const resContracts = await getRenterContracts();
        console.log("Contracts response:", resContracts);
        // Xử lý các format khác nhau của response
        const contractsData = resContracts?.data || resContracts?.result || resContracts?.content || resContracts || [];
        console.log("Contracts data:", contractsData);
        // Đảm bảo contractsData luôn là array
        const contractsArray = Array.isArray(contractsData) ? contractsData : [];
        setContracts(contractsArray);
        
        // Hóa đơn - lấy danh sách hóa đơn của renter
        const resBills = await getMyBills();
        console.log("Bills response:", resBills);
        // Xử lý các format khác nhau của response
        const billsData = resBills?.result || resBills?.content || resBills || [];
        console.log("Bills data:", billsData);
        // Đảm bảo billsData luôn là array
        const billsArray = Array.isArray(billsData) ? billsData : [];
        setBills(billsArray);
        
        // Thống kê hóa đơn
        const stats = await getBillStats();
        setBillStats({
          unpaid: stats.unpaid || 0,
          overdue: stats.overdue || 0,
          paid: stats.paid || 0,
          total: (stats.unpaid || 0) + (stats.overdue || 0) + (stats.paid || 0),
        });
        setBillStatusPie([
          { name: "Đã thanh toán", value: stats.paid },
          { name: "Chưa thanh toán", value: stats.unpaid },
          { name: "Quá hạn", value: stats.overdue },
        ]);
      } catch (err) {
        console.error("Renter dashboard error:", err, err?.response?.data);
        message.error("Lỗi khi tải dữ liệu thống kê");
      }
      setLoading(false);
    };

    useEffect(() => {
      fetchData();
    }, []);

    useEffect(() => {
      if (room) {
        fetchElectricityData();
      }
    }, [room]);

    if (loading) return <Spin size="large" style={{ marginTop: 100 }} />;

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
              background: "#fff",
              borderRight: "1px solid #eee",
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
            minHeight: isMobile ? "calc(100vh - 60px)" : "100vh"
          }}>
            <h1 style={{ 
              fontSize: isMobile ? 20 : 24,
              marginBottom: isMobile ? 16 : 24,
              color: "#001529"
            }}>
              Tổng quan
            </h1>
            
            {/* Thống kê tổng quan */}
            <Row gutter={isMobile ? 12 : 16} style={{ marginBottom: isMobile ? 16 : 24 }}>
              <Col span={statsColSpan} style={{ marginBottom: isMobile ? 12 : 0 }}>
                <Card style={{ 
                  height: isMobile ? 'auto' : 120,
                  borderRadius: 8,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
                }}>
                  <Statistic 
                    title="Phòng hiện tại" 
                    value={(() => {
                      console.log("Current room state:", room);
                      if (room && room.roomNumber) {
                        return `Phòng ${room.roomNumber}`;
                      } else if (room && room.room) {
                        return `Phòng ${room.room.roomNumber}`;
                      } else {
                        return "Chưa có phòng";
                      }
                    })()}
                    valueStyle={{ 
                      fontSize: isMobile ? 16 : 20,
                      fontWeight: 600,
                      color: "#1890ff"
                    }}
                    titleStyle={{ 
                      fontSize: isMobile ? 14 : 16,
                      color: "#666"
                    }}
                  />
                </Card>
              </Col>
              <Col span={statsColSpan} style={{ marginBottom: isMobile ? 12 : 0 }}>
                <Card style={{ 
                  height: isMobile ? 'auto' : 120,
                  borderRadius: 8,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
                }}>
                  <Statistic 
                    title="Hợp đồng đang hiệu lực" 
                    value={(() => {
                      const activeCount = Array.isArray(contracts) ? contracts.filter(c => c.contractStatus === "ACTIVE").length : 0;
                      console.log("Active contracts count:", activeCount, "from", contracts);
                      console.log("All contracts:", contracts);
                      return activeCount;
                    })()}
                    valueStyle={{ 
                      fontSize: isMobile ? 16 : 20,
                      fontWeight: 600,
                      color: "#52c41a"
                    }}
                    titleStyle={{ 
                      fontSize: isMobile ? 14 : 16,
                      color: "#666"
                    }}
                  />
                </Card>
              </Col>
              <Col span={statsColSpan} style={{ marginBottom: isMobile ? 12 : 0 }}>
                <Card style={{ 
                  height: isMobile ? 'auto' : 120,
                  borderRadius: 8,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
                }}>
                  <Statistic 
                    title="Hóa đơn chưa thanh toán" 
                    value={(() => {
                      const unpaidCount = Array.isArray(bills) ? bills.filter(b => !b.status).length : 0;
                      console.log("Unpaid bills count:", unpaidCount, "from", bills);
                      console.log("All bills:", bills);
                      return unpaidCount;
                    })()}
                    valueStyle={{ 
                      fontSize: isMobile ? 16 : 20,
                      fontWeight: 600,
                      color: "#faad14"
                    }}
                    titleStyle={{ 
                      fontSize: isMobile ? 14 : 16,
                      color: "#666"
                    }}
                  />
                </Card>
              </Col>
            </Row>

            {/* Biểu đồ trạng thái hóa đơn và sử dụng điện */}
            <Row gutter={isMobile ? 12 : 24} style={{ marginBottom: isMobile ? 16 : 24 }}>
              <Col span={chartColSpan} style={{ marginBottom: isMobile ? 12 : 0 }}>
                <Card 
                  title="Trạng thái hóa đơn"
                  style={{ 
                    borderRadius: 8,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
                  }}
                  headStyle={{
                    fontSize: isMobile ? 14 : 16,
                    fontWeight: 600,
                    color: "#001529"
                  }}
                >
                  <ResponsiveContainer width="100%" height={isMobile ? 200 : 220}>
                    <PieChart>
                      <Pie
                        data={billStatusPie}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={isMobile ? 60 : 70}
                        label
                      >
                        {billStatusPie.map((entry, index) => (
                          <Cell key={`cell-bill-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </Card>
              </Col>
              <Col span={chartColSpan} style={{ marginBottom: isMobile ? 12 : 0 }}>
                <Card 
                  title="Sử dụng điện theo tháng (kWh)"
                  style={{ 
                    borderRadius: 8,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
                  }}
                  headStyle={{
                    fontSize: isMobile ? 14 : 16,
                    fontWeight: 600,
                    color: "#001529"
                  }}
                >
                  <ResponsiveContainer width="100%" height={isMobile ? 200 : 220}>
                    <LineChart data={electricityData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="month" 
                        tick={{ fontSize: isMobile ? 10 : 12 }}
                        angle={-45}
                        textAnchor="end"
                        height={isMobile ? 50 : 60}
                      />
                      <YAxis 
                        tick={{ fontSize: isMobile ? 10 : 12 }}
                        label={{ 
                          value: 'kWh', 
                          angle: -90, 
                          position: 'insideLeft', 
                          fontSize: isMobile ? 10 : 12 
                        }}
                      />
                      <Tooltip 
                        formatter={(value, name) => [
                          `${value} kWh`, 
                          name === 'consumption' ? 'Tổng tiêu thụ' : 'Trung bình'
                        ]}
                        labelFormatter={(label) => `Tháng ${label}`}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="consumption" 
                        stroke="#8884d8" 
                        strokeWidth={2}
                        name="Tổng tiêu thụ"
                        dot={{ fill: '#8884d8', strokeWidth: 2, r: isMobile ? 3 : 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </Card>
              </Col>
            </Row>
          </div>
        </div>

        {/* Mobile Drawer */}
        {isMobile && (
          <Drawer
            title="Menu"
            placement="left"
            onClose={() => setMobileMenuOpen(false)}
            open={mobileMenuOpen}
            width={250}
            bodyStyle={{ padding: 0 }}
          >
            <RenterSidebar isDrawer={true} onMenuClick={() => setMobileMenuOpen(false)} />
          </Drawer>
        )}
      </div>
    </div>
  );
};

export default RenterDashboardPage; 