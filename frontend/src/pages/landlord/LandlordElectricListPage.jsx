import React, { useState, useEffect } from "react";
import { Layout, Row, Col, DatePicker, Select, Button, Popover } from "antd";
import dayjs from "dayjs";
import PageHeader from "../../components/common/PageHeader";
import LandlordSidebar from "../../components/layout/LandlordSidebar";
import ElectricTable from "../../components/landlord/ElectricTable";
import { getElectricReadings } from "../../services/electricReadingApi";
import { getRoomsWithElectricReadings } from "../../services/roomService";
import { FilterOutlined } from "@ant-design/icons";

const { Sider, Content } = Layout;
const { Option } = Select;
const { RangePicker } = DatePicker;

export default function LandlordElectricListPage() {
  const [dateRange, setDateRange] = useState([null, null]);
  const [selectedBuilding, setSelectedBuilding] = useState("All");
  const [selectedCycle, setSelectedCycle] = useState("All");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  const [electricData, setElectricData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [roomMap, setRoomMap] = useState({});
  const [roomList, setRoomList] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [filterVisible, setFilterVisible] = useState(false);
  const [tempDateRange, setTempDateRange] = useState(dateRange);
  const [tempRoom, setTempRoom] = useState(selectedRoom);

  useEffect(() => {
    const fetchRooms = async () => {
      const res = await getRoomsWithElectricReadings();
      setRoomList(res || []);
    };
    fetchRooms();
  }, []);

  useEffect(() => {
    reloadElectricData();
    // eslint-disable-next-line
  }, [dateRange, selectedRoom]);

  useEffect(() => {
    setTempDateRange(dateRange);
  }, [dateRange]);
  useEffect(() => {
    setTempRoom(selectedRoom);
  }, [selectedRoom]);

  const reloadElectricData = async () => {
    setLoading(true);
    try {
      let params = { serviceId: 1 };
      if (dateRange[0] && dateRange[1]) {
        params = {
          ...params,
          startDate: dateRange[0].format("YYYY-MM-DD"),
          endDate: dateRange[1].format("YYYY-MM-DD"),
        };
      }
      if (selectedRoom) {
        params = { ...params, roomId: selectedRoom };
      }
      console.log("Params gửi lên readings:", params);
      const res = await getElectricReadings(params);
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

  const filterContent = (
    <div style={{ minWidth: 250 }}>
      <div style={{ marginBottom: 12 }}>
        <span>Khoảng ngày</span>
        <RangePicker
          value={tempDateRange}
          onChange={setTempDateRange}
          format="DD/MM/YYYY"
          allowClear
          style={{ width: "100%" }}
        />
      </div>
      <div style={{ marginBottom: 12 }}>
        <span>Phòng</span>
        <Select
          showSearch
          allowClear
          placeholder="Chọn phòng"
          value={tempRoom}
          onChange={setTempRoom}
          style={{ width: "100%" }}
          optionFilterProp="children"
        >
          {roomList.map((room) => (
            <Select.Option key={room.id} value={room.id}>
              {room.roomNumber}
            </Select.Option>
          ))}
        </Select>
      </div>
      <Button
        type="primary"
        block
        onClick={() => {
          setDateRange(tempDateRange);
          setSelectedRoom(tempRoom);
          setFilterVisible(false);
        }}
      >
        Áp dụng
      </Button>
    </div>
  );

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
              <Popover
                content={filterContent}
                title={null}
                trigger="click"
                open={filterVisible}
                onOpenChange={setFilterVisible}
                placement="bottomRight"
              >
                <Button icon={<FilterOutlined />}>Bộ lọc</Button>
              </Popover>
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
