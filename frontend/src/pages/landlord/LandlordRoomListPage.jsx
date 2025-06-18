import React, { useState, useMemo } from "react";
import { Layout, Pagination, Input, Button, Space, Popover } from "antd";
import {
  SearchOutlined,
  PlusOutlined,
  FilterOutlined,
} from "@ant-design/icons";
import LandlordSidebar from "../../components/layout/LandlordSidebar";
import RoomTable from "../../components/landlord/RoomTable";
import RoomFilterPopover from "../../components/landlord/RoomFilterPopover";
import PageHeader from "../../components/common/PageHeader"; // ✅ Dùng PageHeader

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
  const pageSize = 6;

  const handleSearch = () => {
    setCurrentPage(1);
  };

  const handleFilter = (newFilter) => {
    setFilter(newFilter);
    setCurrentPage(1);
  };

  const filteredRooms = useMemo(() => {
    return mockRooms
      .filter((room) => room.name.toLowerCase().includes(search.toLowerCase()))
      .filter((room) => (filter.status ? room.status === filter.status : true))
      .filter((room) =>
        filter.priceRange[0] != null ? room.price >= filter.priceRange[0] : true
      )
      .filter((room) =>
        filter.priceRange[1] != null ? room.price <= filter.priceRange[1] : true
      );
  }, [search, filter]);

  const paginatedRooms = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRooms.slice(start, start + pageSize);
  }, [filteredRooms, currentPage]);

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
              <Button type="primary" icon={<PlusOutlined />}>
                Add Room
              </Button>
            </Space>
          </div>

          {/* ✅ Room cards */}
          <RoomTable rooms={paginatedRooms} />

          {/* ✅ Pagination */}
          <div style={{ marginTop: 24, textAlign: "center" }}>
            <Pagination
              current={currentPage}
              pageSize={pageSize}
              total={filteredRooms.length}
              onChange={(page) => setCurrentPage(page)}
            />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
