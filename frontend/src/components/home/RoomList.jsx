import React, { useEffect, useState, useRef } from "react";
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
  const [sortOrder, setSortOrder] = useState("");

  const searchRef = useRef("");
  const filterRef = useRef(filter);

  const fetchRooms = async (page = 1, keyword = searchRef.current, sort = sortOrder, customFilter = filterRef.current) => {
    setLoading(true);

    const trimmed = keyword.trim();
    let searchFilter = "";
    if (trimmed) {
      const safe = trimmed.replace(/'/g, "");
      searchFilter = `(roomNumber~'${safe}' or pricePerMonth~'${safe}' or roomStatus~'${safe}' or area~'${safe}')`;
    }

    const combinedFilter = [customFilter, searchFilter].filter(Boolean).join(" and ");
    const sortParam = sort ? `pricePerMonth,${sort}` : "";

    const response = await getAllRooms(
      page - 1,
      pagination.pageSize,
      combinedFilter,
      sortParam
    );

    setRooms(response.result || []);
    setPagination((prev) => ({
      ...prev,
      current: page,
      total: response.meta?.total ?? 0,
    }));
    setLoading(false);
  };

  useEffect(() => {
    filterRef.current = filter;
    fetchRooms(1);
    // eslint-disable-next-line
  }, [filter, sortOrder]);

  const handleSearch = (value) => {
    setSearch(value);
    searchRef.current = value;
    fetchRooms(1, value);
  };

  const handleClearSearch = () => {
    setSearch("");
    searchRef.current = "";
    fetchRooms(1, "", sortOrder, filterRef.current);
  };

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

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "50px" }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!loading && rooms.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "50px 20px" }}>
        <img
          src="https://cdn-icons-png.flaticon.com/512/2748/2748558.png"
          alt="No result"
          style={{ width: 120, marginBottom: 24 }}
        />
        <h3 style={{ fontWeight: 600, marginBottom: 8 }}>
          No matching rooms found
        </h3>
        <p style={{ color: "#666", maxWidth: 400, margin: "0 auto 16px" }}>
          Please check your keyword or try different values.
        </p>
        <Button type="primary" onClick={handleClearSearch}>
          Clear search
        </Button>
      </div>
    );
  }

  return (
    <div style={{ padding: "40px 20px" }}>
      <div style={{ textAlign: "center", marginBottom: "30px" }}>
        <Input.Search
          placeholder="Search room number, price, status or area..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onSearch={handleSearch}
          enterButton
          style={{ maxWidth: 300, marginBottom: 12 }}
        />

        <div style={{ marginTop: 8 }}>
          <Button
            type={sortOrder === "asc" ? "primary" : "default"}
            onClick={() => setSortOrder("asc")}
            style={{ marginRight: 8 }}
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
          Previous
        </Button>
        <span>
          Page {pagination.current} / {Math.ceil(pagination.total / pagination.pageSize)} ({pagination.total} Rooms)
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
