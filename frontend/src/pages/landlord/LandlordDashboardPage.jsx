import React, { useEffect, useState } from "react";
import { Card, Row, Col, Statistic, Spin, message } from "antd";
import LandlordSidebar from "../../components/layout/LandlordSidebar";
import { getRoomStats, getAllRooms } from "../../services/roomService";
import { getAllContracts } from "../../services/contractApi";
import { getBillStats, getAllBills } from "../../services/billApi";
import dayjs from "dayjs";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d"];

const LandlordDashboardPage = () => {
  const [loading, setLoading] = useState(true);
  const [roomStats, setRoomStats] = useState({ total: 0, rented: 0, available: 0 });
  const [contractStats, setContractStats] = useState({ active: 0, expiring: 0 });
  const [billStats, setBillStats] = useState({ revenue: 0, monthRevenue: 0, unpaid: 0, overdue: 0 });
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
        const rented = rooms.filter(r => r.hasActiveContract).length;
        const available = rooms.length - rented;
        setRoomStats({ total: rooms.length, rented, available });
        setRoomPie([
          { name: "Đang cho thuê", value: rented },
          { name: "Còn trống", value: available },
        ]);

        // Hợp đồng
        let active = 0, expiring = 0;
        const resContracts = await getAllContracts({ page: 0, size: 1000 });
        const contracts = resContracts?.result || [];
        const now = dayjs();
        active = contracts.filter(c => c.contractStatus === 'ACTIVE').length;
        expiring = contracts.filter(c => c.contractStatus === 'ACTIVE' && c.contractEndDate && dayjs(c.contractEndDate).diff(now, 'day') <= 7).length;
        setContractStats({ active, expiring });

        // Hóa đơn
        const resBills = await getAllBills({ page: 0, size: 1000 });
        const bills = resBills?.content || [];
        let revenue = 0, monthRevenue = 0, unpaid = 0, overdue = 0, paid = 0;
        const thisMonth = dayjs().format('YYYY-MM');
        const billStatusCount = { PAID: 0, UNPAID: 0, OVERDUE: 0 };
        const revenueMonthMap = {};
        bills.forEach(bill => {
          if (bill.status === 'PAID') {
            revenue += bill.totalAmount || 0;
            paid++;
            if (bill.toDate && dayjs(bill.toDate).format('YYYY-MM') === thisMonth) {
              monthRevenue += bill.totalAmount || 0;
            }
          }
          if (bill.status === 'UNPAID') {
            unpaid++;
            if (bill.toDate && dayjs(bill.toDate).isBefore(now, 'day')) {
              overdue++;
              billStatusCount.OVERDUE++;
            } else {
              billStatusCount.UNPAID++;
            }
          }
          if (bill.status === 'PAID') billStatusCount.PAID++;

          // Doanh thu theo tháng
          if (bill.status === 'PAID' && bill.toDate) {
            const month = dayjs(bill.toDate).format('YYYY-MM');
            revenueMonthMap[month] = (revenueMonthMap[month] || 0) + (bill.totalAmount || 0);
          }
        });
        setBillStats({ revenue, monthRevenue, unpaid, overdue });
        setBillStatusPie([
          { name: "Đã thanh toán", value: billStatusCount.PAID },
          { name: "Chưa thanh toán", value: billStatusCount.UNPAID },
          { name: "Quá hạn", value: billStatusCount.OVERDUE },
        ]);
        // Doanh thu 6 tháng gần nhất
        const months = [];
        for (let i = 5; i >= 0; i--) {
          const m = dayjs().subtract(i, 'month').format('YYYY-MM');
          months.push(m);
        }
        setRevenueByMonth(months.map(m => ({ month: m, revenue: revenueMonthMap[m] || 0 })));
      } catch (err) {
        message.error("Lỗi khi tải dữ liệu thống kê");
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  if (loading) return <Spin size="large" style={{ marginTop: 100 }} />;

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <div style={{ minWidth: 220, background: "#fff", borderRight: "1px solid #eee" }}>
        <LandlordSidebar />
      </div>
      <div style={{ flex: 1, padding: 24 }}>
        <h1>Tổng quan</h1>
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Card>
              <Statistic title="Tổng số phòng" value={roomStats.total} />
              <div style={{ fontSize: 12, color: '#888' }}>
                Đang cho thuê: {roomStats.rented} / Còn trống: {roomStats.available}
              </div>
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic title="Hợp đồng đang hiệu lực" value={contractStats.active} />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic title="Doanh thu" value={billStats.revenue} suffix="₫" />
              <div style={{ fontSize: 12, color: '#888' }}>
                Tháng này: {billStats.monthRevenue} ₫
              </div>
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic title="Số hóa đơn chưa thanh toán" value={billStats.unpaid} />
            </Card>
          </Col>
        </Row>
        <Row gutter={24} style={{ marginBottom: 24 }}>
          <Col span={8}>
            <Card title="Tỉ lệ phòng cho thuê">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={roomPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
                    {roomPie.map((entry, index) => (
                      <Cell key={`cell-room-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </Col>
          <Col span={8}>
            <Card title="Doanh thu 6 tháng gần nhất">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={revenueByMonth}>
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="revenue" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </Col>
          <Col span={8}>
            <Card title="Trạng thái hóa đơn">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={billStatusPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
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
        <Row gutter={16}>
          <Col span={6}>
            <Card>
              <Statistic title="Hợp đồng sắp hết hạn (7 ngày)" value={contractStats.expiring} />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic title="Hóa đơn quá hạn" value={billStats.overdue} />
            </Card>
          </Col>
        </Row>
      </div>
    </div>
  );
};

export default LandlordDashboardPage; 