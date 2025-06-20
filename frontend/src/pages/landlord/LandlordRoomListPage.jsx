import React, { useState, useEffect } from "react";
import { Layout, Pagination, Input, Button, Space, Popover, message } from "antd";
import {
  SearchOutlined,
  PlusOutlined,
  FilterOutlined,
} from "@ant-design/icons";
import LandlordSidebar from "../../components/layout/LandlordSidebar";
import RoomTable from "../../components/landlord/RoomTable";
import RoomFilterPopover from "../../components/landlord/RoomFilterPopover";
import PageHeader from "../../components/common/PageHeader"; // ✅ Dùng PageHeader
import { useNavigate } from "react-router-dom"; 
import { getAllRooms } from "../../services/roomService";

import image1 from "../../assets/RoomImage/image1.png";
import image2 from "../../assets/RoomImage/image2.png";

const { Sider, Content } = Layout;

const mockRooms = [
  {
    id: 1,
    name: "Room 201 - Building B",
    price: 2300000,
    status: "Available",
    image: image1,
  },
  {
    id: 2,
    name: "Room 202 - Building B",
    price: 2000000,
    status: "Full",
    image: image2,
  },
  {
    id: 3,
    name: "Room 203 - Building B",
    price: 2500000,
    status: "Full",
    image: image1,
  },
  {
    id: 4,
    name: "Room 204 - Building B",
    price: 2100000,
    status: "Available",
    image: image2,
  },
  {
    id: 5,
    name: "Room 205 - Building B",
    price: 2600000,
    status: "Available",
    image: image1,
  },
];

export default function LandlordRoomListPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState({
    status: null,
    priceRange: [null, null],
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [rooms, setRooms] = useState([]);
  const [total, setTotal] = useState(0);
  const pageSize = 6;
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // Tạo filter DSL cho backend
  const buildFilterDSL = () => {
    let filters = [];
    if (search) filters.push(`roomNumber~'*${search}*'`);
    if (filter.status) filters.push(`roomStatus='${filter.status}'`);
    if (filter.priceRange[0] != null) filters.push(`pricePerMonth>=${filter.priceRange[0]}`);
    if (filter.priceRange[1] != null) filters.push(`pricePerMonth<=${filter.priceRange[1]}`);
    return filters.join(" and ");
  };

  const fetchRooms = async () => {
    setLoading(true);
    try {
      const filterDSL = buildFilterDSL();
      const res = await getAllRooms(currentPage - 1, pageSize, filterDSL);
      setRooms(res.result || []);
      setTotal(res.meta?.total || 0);
    } catch (err) {
      message.error("Failed to load rooms");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRooms();
    // eslint-disable-next-line
  }, [search, filter, currentPage]);

  const handleSearch = () => setCurrentPage(1);
  const handleFilter = (newFilter) => {
    setFilter(newFilter);
    setCurrentPage(1);
  };

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider width={220}>
        <LandlordSidebar />
      </Sider>

      <Layout>
        <Content
          style={{
            padding: "24px",
            paddingTop: "32px", // ✅ Thêm khoảng cách trên
            background: "#fff",
            borderRadius: 8,
          }}
        >
          {/* ✅ Header: Page Title + Search + Filter + Add */}
          <div
            style={{
              marginBottom: 16,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <PageHeader title="Room List" /> {/* ✅ Dùng component chung */}
            <Space>
              <Input
                placeholder="Search room..."
                allowClear
                prefix={<SearchOutlined />}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onPressEnter={handleSearch}
              />
              <Popover
                content={<RoomFilterPopover onFilter={handleFilter} />}
                trigger="click"
                placement="bottomRight"
              >
                <Button icon={<FilterOutlined />}>Filter</Button>
              </Popover>
              <Button type="primary" 
              icon={<PlusOutlined />}
              onClick={() => navigate("/landlord/rooms/add")}
              >
                Add Room
              </Button>
            </Space>
          </div>

          {/* ✅ Room cards */}
          <RoomTable rooms={rooms} loading={loading} />

          {/* ✅ Pagination */}
          <div style={{ marginTop: 24, textAlign: "center" }}>
            <Pagination
              current={currentPage}
              pageSize={pageSize}
              total={total}
              onChange={(page) => setCurrentPage(page)}
            />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
