import React, { useEffect, useState } from "react";
import { getAllRooms } from "../../services/roomService";
import { Row, Col, Spin, Button, Input } from "antd";
import { LeftOutlined, RightOutlined } from "@ant-design/icons";
import RoomCard from "./RoomCard";

export default function RoomList({ filter }) {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 9,
    total: 0,
  });
  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState(""); // "asc" | "desc"

  const fetchRooms = async (page = 1, sort = sortOrder) => {
    setLoading(true);

    const searchFilter = search ? `roomNumber~'${search}'` : "";
    const combinedFilter = [filter, searchFilter].filter(Boolean).join(" and ");
    const sortParam = sort ? `price_per_month ${sort}` : "";

    const response = await getAllRooms(
      page - 1,
      pagination.pageSize,
      combinedFilter,
      sortParam
    );

    setRooms(response.result || []);
    setPagination({
      ...pagination,
      current: page,
      total: response.meta?.total ?? 0,
    });
    setLoading(false);
  };

  useEffect(() => {
    fetchRooms(1);
    // eslint-disable-next-line
  }, [filter, search, sortOrder]);

  const handlePrevPage = () => {
    if (pagination.current > 1) {
      fetchRooms(pagination.current - 1);
    }
  };

  const handleNextPage = () => {
    const totalPages = Math.ceil(pagination.total / pagination.pageSize);
    if (pagination.current < totalPages) {
      fetchRooms(pagination.current + 1);
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
      <h2 style={{ textAlign: "center", marginBottom: "30px" }}>Room List</h2>

      {/* Search */}
      <div
        style={{
          marginBottom: 12,
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          alignItems: "center",
        }}
      >
        <Input.Search
          placeholder="Searching Room..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onSearch={(value) => setSearch(value)}
          enterButton
          style={{ maxWidth: 300 }}
        />
      </div>

      {/* Sort buttons */}
      <div
        style={{
          marginBottom: 20,
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <Button
          type={sortOrder === "asc" ? "primary" : "default"}
          onClick={() => setSortOrder("asc")}
        >
          Price ascending
        </Button>
        <Button
          type={sortOrder === "desc" ? "primary" : "default"}
          onClick={() => setSortOrder("desc")}
        >
          Price descending
        </Button>
      </div>

      {/* Room cards */}
      <Row gutter={[24, 24]}>
        {rooms.map((room) => (
          <Col xs={24} sm={12} md={8} key={room.id}>
            <RoomCard room={room} />
          </Col>
        ))}
      </Row>

      {/* Pagination */}
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
          Previous
        </Button>
        <span>
          Page {pagination.current} / {Math.ceil(pagination.total / pagination.pageSize)} (
          {pagination.total} Rooms)
        </span>
        <Button
          icon={<RightOutlined />}
          onClick={handleNextPage}
          disabled={
            pagination.current >= Math.ceil(pagination.total / pagination.pageSize)
          }
        >
          Next
        </Button>
      </div>
    </div>
  );
}
