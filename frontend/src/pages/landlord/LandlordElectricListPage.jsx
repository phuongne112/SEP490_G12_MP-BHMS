import React, { useState, useEffect } from "react";
import { Layout, Row, Col, DatePicker, Select, Button } from "antd";
import dayjs from "dayjs";
import PageHeader from "../../components/common/PageHeader";
import LandlordSidebar from "../../components/layout/LandlordSidebar";
import ElectricTable from "../../components/landlord/ElectricTable";
import { getElectricReadings } from "../../services/electricReadingApi";
import { getAllRooms } from "../../services/roomService";

const { Sider, Content } = Layout;
const { Option } = Select;

export default function LandlordElectricListPage() {
  const [selectedMonth, setSelectedMonth] = useState(dayjs());
  const [selectedBuilding, setSelectedBuilding] = useState("All");
  const [selectedCycle, setSelectedCycle] = useState("All");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  const [electricData, setElectricData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [roomMap, setRoomMap] = useState({});

  useEffect(() => {
    reloadElectricData();
    // eslint-disable-next-line
  }, []);

  const reloadElectricData = async () => {
    setLoading(true);
    try {
      const res = await getElectricReadings();
      const mapped = (res.data || res).map((item) => ({
        key: item.id,
        roomId: item.roomId,
        roomNumber: item.roomNumber,
        oldReading: item.oldReading,
        newReading: item.newReading,
        createdDate: item.createdDate,
      }));
      setElectricData(mapped);
    } catch {
      setElectricData([]);
    }
    setLoading(false);
  };

  const pagedData = electricData.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleSaveBill = () => {
    console.log("Saving bill for:", selectedMonth.format("MM/YYYY"));
    // TODO: Gọi API lưu bill nếu có
  };

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider width={220} style={{ background: "#001529" }}>
        <LandlordSidebar />
      </Sider>

      <Layout style={{ marginTop: 20, marginLeft: 20 }}>
        <PageHeader title="Chỉ số điện tổng" />
        <Content style={{ margin: "20px" }}>
          <Row gutter={16} style={{ marginBottom: 20 }}>
            <Col>
              <DatePicker
                picker="month"
                value={selectedMonth}
                onChange={(date) => setSelectedMonth(date)}
                format="MM/YYYY"
              />
            </Col>

            <Col>
              <Select
                value={selectedBuilding}
                style={{ width: 140 }}
                onChange={setSelectedBuilding}
              >
                <Option value="All">Tất cả tòa</Option>
                <Option value="A">Tòa A</Option>
                <Option value="B">Tòa B</Option>
              </Select>
            </Col>

            <Col>
              <Select
                value={selectedCycle}
                style={{ width: 140 }}
                onChange={setSelectedCycle}
              >
                <Option value="All">Tất cả chu kỳ</Option>
                <Option value="Monthly">Hàng tháng</Option>
                <Option value="Quarterly">Hàng quý</Option>
              </Select>
            </Col>

            <Col>
              <Button type="primary" onClick={handleSaveBill}>
                Lưu hóa đơn
              </Button>
            </Col>
          </Row>
          <ElectricTable
            dataSource={pagedData}
            currentPage={currentPage}
            pageSize={pageSize}
            total={electricData.length}
            onPageChange={(page) => setCurrentPage(page)}
            loading={loading}
            onReload={reloadElectricData}
          />
        </Content>
      </Layout>
    </Layout>
  );
}
