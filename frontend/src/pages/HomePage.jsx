import React, { useState, useEffect } from "react";
import Footer from "../components/layout/Footer";
import Header from "../components/layout/Header";
import RoomList from "../components/home/RoomList";
import {
  Slider,
  Select,
  Button,
  Typography,
  Carousel,
  Dropdown,
  Badge,
  Input,
  Spin,
} from "antd";
import { useNavigate } from "react-router-dom";
import { BellOutlined } from "@ant-design/icons";
import { getAllRooms } from "../services/roomService";

const { Option } = Select;
const { Title } = Typography;

const FilterBox = ({ title, children }) => (
  <div
    style={{
      marginBottom: 24,
    }}
  >
    <Title level={5} style={{ marginBottom: 12, fontSize: 16 }}>
      {title}
    </Title>
    {children}
  </div>
);

export default function HomePage() {
  const [area, setArea] = useState([22, 27]);
  const [price, setPrice] = useState([0, 10000000]);
  const [status, setStatus] = useState("All");
  const [bedrooms, setBedrooms] = useState([1, 3]);
  const [bathrooms, setBathrooms] = useState([1, 2]);
  const [hasAsset, setHasAsset] = useState("All");
  const [appliedFilter, setAppliedFilter] = useState("isActive=true");
  const [building, setBuilding] = useState("");
  const [buildingOptions, setBuildingOptions] = useState([]);
  const [buildingLoading, setBuildingLoading] = useState(false);
  const navigate = useNavigate();

  // Fetch unique building list on mount
  useEffect(() => {
    const fetchBuildings = async () => {
      setBuildingLoading(true);
      try {
        const res = await getAllRooms(0, 1000, "", "");
        const allRooms = res.result || [];
        const uniqueBuildings = Array.from(
          new Set(allRooms.map((r) => r.building).filter(Boolean))
        );
        setBuildingOptions(uniqueBuildings);
      } catch (e) {
        setBuildingOptions([]);
      }
      setBuildingLoading(false);
    };
    fetchBuildings();
  }, []);

  const handleQuickFilter = (filter) => {
    setAppliedFilter(filter);
    document
      .getElementById("room-list-section")
      ?.scrollIntoView({ behavior: "smooth" });
  };

  const buildRoomFilter = () => {
    const dsl = [];
    // Always filter for active rooms on the homepage
    dsl.push(`isActive=true`);

    if (area?.length === 2) {
      dsl.push(`area >= ${area[0]}`);
      dsl.push(`area <= ${area[1]}`);
    }
    if (price?.length === 2) {
      dsl.push(`pricePerMonth >= ${price[0]}`);
      dsl.push(`pricePerMonth <= ${price[1]}`);
    }
    if (bedrooms?.length === 2) {
      dsl.push(`numberOfBedrooms >= ${bedrooms[0]}`);
      dsl.push(`numberOfBedrooms <= ${bedrooms[1]}`);
    }
    if (bathrooms?.length === 2) {
      dsl.push(`numberOfBathrooms >= ${bathrooms[0]}`);
      dsl.push(`numberOfBathrooms <= ${bathrooms[1]}`);
    }
    if (status !== "All") {
      dsl.push(`roomStatus = '${status}'`);
    }
    if (hasAsset === "true") {
      dsl.push("assets IS NOT EMPTY");
    } else if (hasAsset === "false") {
      dsl.push("assets IS EMPTY");
    }
    if (building && building.trim() !== "") {
      dsl.push(`building='${building.trim()}'`);
    }
    return dsl.join(" and ");
  };

  const handleApplyFilter = () => {
    const dsl = buildRoomFilter().trim();
    setAppliedFilter(dsl);
  };

  const handleViewDetail = (room) => {
    navigate(`/rooms/${room.roomNumber}`, { state: { room } });
  };

  return (
    <div style={{ background: "#fff", minHeight: "100vh" }}>
      <Header />

      <Carousel
        autoplay
        dotPosition="bottom"
        style={{
          margin: "24px auto",
          width: "95%",
          maxWidth: 1400,
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        <div>
          <div style={{ height: 500, overflow: "hidden" }}>
            <img
              src="/banners/banner1.png"
              alt="Banner 1"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
        </div>
        <div>
          <div style={{ height: 500, overflow: "hidden" }}>
            <img
              src="/banners/banner2.png"
              alt="Banner 2"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
        </div>
        <div>
          <div style={{ height: 500, overflow: "hidden" }}>
            <img
              src="/banners/banner3.png"
              alt="Banner 3"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
        </div>
        <div>
          <div style={{ height: 500, overflow: "hidden" }}>
            <img
              src="/banners/banner4.png"
              alt="Banner 4"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
        </div>
        <div>
          <div style={{ height: 500, overflow: "hidden" }}>
            <img
              src="/banners/banner5.png"
              alt="Banner 5"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
        </div>
        <div>
          <div style={{ height: 500, overflow: "hidden" }}>
            <img
              src="/banners/banner6.png"
              alt="Banner 6"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
        </div>
      </Carousel>

      <div
        id="room-list-section"
        style={{
          width: "95%",
          maxWidth: 1400,
          margin: "24px auto",
          display: "flex",
          alignItems: "flex-start",
          gap: "24px",
        }}
      >
        <div
          style={{
            flex: "0 0 300px",
            background: "#fff",
            padding: "24px",
            borderRadius: 8,
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
            position: "sticky",
            top: 24,
          }}
        >
          <Title level={4} style={{ marginBottom: 24, fontWeight: 600 }}>
            Bộ lọc
          </Title>
          <FilterBox title="Diện tích (m²)">
            <Slider range min={15} max={40} value={area} onChange={setArea} />
          </FilterBox>

          <FilterBox title="Trạng thái phòng">
            <Select
              value={status}
              onChange={setStatus}
              style={{ width: "100%" }}
            >
              <Option value="All">Tất cả</Option>
              <Option value="Available">Có sẵn</Option>
              <Option value="Occupied">Đã thuê</Option>
              <Option value="Maintenance">Bảo trì</Option>
              <Option value="Inactive">Không hoạt động</Option>
            </Select>
          </FilterBox>

          <FilterBox title="Số phòng ngủ">
            <Slider
              range
              min={0}
              max={5}
              value={bedrooms}
              onChange={setBedrooms}
            />
          </FilterBox>

          <FilterBox title="Số phòng tắm">
            <Slider
              range
              min={0}
              max={5}
              value={bathrooms}
              onChange={setBathrooms}
            />
          </FilterBox>

          <FilterBox title="Giá (VND)">
            <Slider
              range
              min={0}
              max={10000000}
              value={price}
              onChange={setPrice}
              tipFormatter={(v) => v.toLocaleString()}
            />
          </FilterBox>

          <FilterBox title="Có nội thất">
            <Select
              value={hasAsset}
              onChange={setHasAsset}
              style={{ width: "100%" }}
            >
              <Option value="All">Tất cả</Option>
              <Option value="true">Có</Option>
              <Option value="false">Không</Option>
            </Select>
          </FilterBox>

          <FilterBox title="Tòa nhà">
            <Select
              value={building}
              onChange={(val) => setBuilding(val)}
              style={{ width: "100%" }}
              loading={buildingLoading}
              allowClear
              placeholder="Chọn tòa nhà"
            >
              <Option value="">Tất cả</Option>
              {buildingOptions.map((b) => (
                <Option key={b} value={b}>
                  {b}
                </Option>
              ))}
            </Select>
          </FilterBox>

          <Button type="primary" block onClick={handleApplyFilter}>
            Áp dụng bộ lọc
          </Button>
        </div>

        <div
          style={{
            flex: 1,
            background: "#fff",
            borderRadius: 8,
            padding: "24px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          }}
        >
          <RoomList filter={appliedFilter} onViewDetail={handleViewDetail} />
        </div>
      </div>

      <Footer />
    </div>
  );
}
