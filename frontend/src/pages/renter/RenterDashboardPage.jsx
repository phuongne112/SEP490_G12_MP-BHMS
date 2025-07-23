import React, { useState, useEffect } from "react";
import { Card, Row, Col, Statistic, Spin, message } from "antd";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from "recharts";
import RenterSidebar from "../../components/layout/RenterSidebar";
import { getMyRoom } from "../../services/roomService";
import { getRenterContracts } from "../../services/contractApi";
import { getBillStats, getMyBills } from "../../services/billApi";
import dayjs from "dayjs";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

const RenterDashboardPage = () => {
  const [loading, setLoading] = useState(true);
  const [room, setRoom] = useState(null);
  const [contracts, setContracts] = useState([]);
  const [bills, setBills] = useState([]);
  const [billStats, setBillStats] = useState({ unpaid: 0, overdue: 0, paid: 0, total: 0 });
  const [billStatusPie, setBillStatusPie] = useState([]);



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



    if (loading) return <Spin size="large" style={{ marginTop: 100 }} />;

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <div style={{ minWidth: 220, background: "#fff", borderRight: "1px solid #eee" }}>
        <RenterSidebar />
      </div>
      <div style={{ flex: 1, padding: 24 }}>
        <h1>Tổng quan</h1>
        
        {/* Thống kê tổng quan */}
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={8}>
            <Card>
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
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card>
              <Statistic 
                title="Hợp đồng đang hiệu lực" 
                value={(() => {
                  const activeCount = Array.isArray(contracts) ? contracts.filter(c => c.contractStatus === "ACTIVE").length : 0;
                  console.log("Active contracts count:", activeCount, "from", contracts);
                  console.log("All contracts:", contracts);
                  return activeCount;
                })()} 
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card>
              <Statistic 
                title="Hóa đơn chưa thanh toán" 
                value={(() => {
                  const unpaidCount = Array.isArray(bills) ? bills.filter(b => !b.status).length : 0;
                  console.log("Unpaid bills count:", unpaidCount, "from", bills);
                  console.log("All bills:", bills);
                  return unpaidCount;
                })()} 
              />
            </Card>
          </Col>
        </Row>

        {/* Biểu đồ trạng thái hóa đơn */}
        <Row gutter={24} style={{ marginBottom: 24 }}>
          <Col span={12}>
            <Card title="Trạng thái hóa đơn">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={billStatusPie}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
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
        </Row>


      </div>
    </div>
  );
};

export default RenterDashboardPage; 