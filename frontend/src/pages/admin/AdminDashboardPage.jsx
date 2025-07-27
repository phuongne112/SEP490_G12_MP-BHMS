import React, { useEffect, useState } from "react";
import { Card, Row, Col, Statistic, Spin, message } from "antd";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { getUserStats } from "../../services/userApi";
import { getAssetStats } from "../../services/assetApi";
import { getBillStats } from "../../services/billApi";
import { getRoomStats } from "../../services/roomService";
import AdminSidebar from "../../components/layout/AdminSidebar";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d"];

const AdminDashboardPage = () => {
  const [loading, setLoading] = useState(true);
  const [userStats, setUserStats] = useState(null);
  const [roomStats, setRoomStats] = useState(null);
  const [assetStats, setAssetStats] = useState(null);
  const [billStats, setBillStats] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [users, rooms, assets, bills] = await Promise.all([
          getUserStats(),
          getRoomStats(),
          getAssetStats(),
          getBillStats(),
        ]);
        setUserStats(users);
        setRoomStats(rooms);
        setAssetStats(assets);
        setBillStats(bills);
      } catch (err) {
        message.error("Lỗi khi tải dữ liệu thống kê");
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  if (loading || !userStats || !roomStats || !assetStats || !billStats) return <Spin size="large" style={{ marginTop: 100 }} />;

  // Chuẩn bị dữ liệu biểu đồ
  const userTypeRatio = [
    { name: "Quản trị viên", value: userStats?.admin || 0 },
    { name: "Người thuê", value: userStats?.renter || 0 },
    { name: "Khách", value: userStats?.guest || 0 },
  ];
  const assetTypeRatio = assetStats?.byType ? Object.entries(assetStats.byType).map(([name, value]) => ({ name, value })) : [];
  const transactionByMonth = billStats?.byMonth ? Object.entries(billStats.byMonth).map(([month, count]) => ({ month, count })) : [];

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <div style={{ minWidth: 220, background: "#fff", borderRight: "1px solid #eee" }}>
        <AdminSidebar />
      </div>
      <div style={{ flex: 1, padding: 24 }}>
        <h1>Thống kê</h1>
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Card>
              <Statistic title="Tổng số người dùng" value={userStats?.total || 0} />
              <div style={{ fontSize: 12, color: '#888' }}>
                (Quản trị viên: {userStats?.admin || 0} / Người thuê: {userStats?.renter || 0} / Khách: {userStats?.guest || 0})
              </div>
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic title="Tổng số phòng" value={roomStats?.total || 0} />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic title="Tổng số giao dịch" value={billStats?.total || 0} />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic title="Doanh thu hệ thống" value={billStats?.revenue || 0} suffix="₫" />
            </Card>
          </Col>
        </Row>
        <Row gutter={24}>
          <Col span={8}>
            <Card title="Tỉ lệ loại người dùng">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={userTypeRatio} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                    {userTypeRatio.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </Col>
          <Col span={8}>
            <Card title="Giao dịch theo tháng">
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={transactionByMonth}>
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </Col>
          <Col span={8}>
            <Card title="Phân loại bất động sản">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={assetTypeRatio} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                    {assetTypeRatio.map((entry, index) => (
                      <Cell key={`cell-asset-${index}`} fill={COLORS[index % COLORS.length]} />
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

export default AdminDashboardPage; 