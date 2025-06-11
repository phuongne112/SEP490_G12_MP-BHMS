import React, { useEffect, useState } from "react";
import { getAllRooms } from "../../services/roomService";
import { Card, Row, Col, Spin, Button, Input } from "antd";
import { PlusOutlined, LeftOutlined, RightOutlined } from "@ant-design/icons";
import RoomCard from "./RoomCard";

export default function RoomList({ filter }) {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 6,
    total: 0,
  });
  const [search, setSearch] = useState("");

  const fetchRooms = async (page = 0, filterValue = filter) => {
    setLoading(true);
    const searchFilter = search ? `roomNumber~'${search}'` : "";
    const combinedFilter = [filter, searchFilter].filter(Boolean).join(" and ");

    const response = await getAllRooms(
      page,
      pagination.pageSize,
      combinedFilter
    );
    setRooms(response.result || []);
    setPagination({
      ...pagination,
      current: response.meta?.page ?? 0,
      total: response.meta?.total ?? 0,
      pages:
        response.meta?.pages ??
        Math.ceil((response.meta?.total ?? 0) / pagination.pageSize),
    });
    setLoading(false);
  };

  // Gọi API khi filter hoặc search đổi
  useEffect(() => {
    fetchRooms(1, filter);
    // eslint-disable-next-line
  }, [filter, search]);

  const handlePrevPage = () => {
    if (pagination.current > 1) {
      fetchRooms(pagination.current - 1, filter);
    }
  };

  const handleNextPage = () => {
    const totalPages = Math.ceil(pagination.total / pagination.pageSize);
    if (pagination.current < totalPages) {
      fetchRooms(pagination.current + 1, filter);
    }
  };

  if (loading && !rooms.length) {
    return (
      <div style={{ textAlign: "center", padding: "50px" }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ padding: "40px 20px" }}>
      <h2 style={{ textAlign: "center", marginBottom: "30px" }}>
        Danh sách phòng
      </h2>
      <div style={{ marginBottom: 16, display: "flex", gap: 8 }}>
        <Input.Search
          placeholder="Tìm kiếm phòng..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onSearch={(value) => setSearch(value)}
          enterButton
          style={{ maxWidth: 300 }}
        />
        <Button type="primary" icon={<PlusOutlined />}>
          Thêm mới
        </Button>
      </div>
      <Row gutter={[24, 24]}>
        {rooms.map((room) => (
          <Col xs={24} sm={12} md={8} key={room.id}>
            <RoomCard room={room} />
          </Col>
        ))}
      </Row>
      <div
        style={{
          marginTop: 24,
          textAlign: "center",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: "16px",
        }}
      >
        <Button
          icon={<LeftOutlined />}
          onClick={handlePrevPage}
          disabled={pagination.current === 1}
        >
          Trang trước
        </Button>
        <span>
          Trang {pagination.current} /{" "}
          {Math.ceil(pagination.total / pagination.pageSize)} (
          {pagination.total} phòng)
        </span>
        <Button
          icon={<RightOutlined />}
          onClick={handleNextPage}
          disabled={
            pagination.current >=
            Math.ceil(pagination.total / pagination.pageSize)
          }
        >
          Trang sau
        </Button>
      </div>
    </div>
  );
}
