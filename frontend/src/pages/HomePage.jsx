// ✅ HomePage.jsx - có filter theo asset
import React, { useState } from "react";
import Footer from "../components/layout/Footer";
import Header from "../components/layout/Header";
import RoomList from "../components/home/RoomList";
import { Slider, Select, Button } from "antd";

const { Option } = Select;

const FilterBox = ({ title, children }) => (
  <div
    style={{
      border: "1px solid #eee",
      borderRadius: 10,
      padding: 16,
      background: "#fafafa",
      marginBottom: 20,
    }}
  >
    <div style={{ fontWeight: 600, marginBottom: 10 }}>{title}</div>
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
  const [appliedFilter, setAppliedFilter] = useState("");

  const buildRoomFilter = () => {
    const dsl = [];
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
    // ✅ Đã chỉnh đúng
    if (hasAsset === "true") {
      dsl.push("assets IS NOT EMPTY");
    } else if (hasAsset === "false") {
      dsl.push("assets IS EMPTY");
    }
    return dsl.join(" and ");
  };

  const handleApplyFilter = () => {
    const dsl = buildRoomFilter().trim();
    setAppliedFilter(dsl);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f5f5f5" }}>
      <Header />
      <div
        style={{
          maxWidth: 1300,
          margin: "32px auto 0",
          background: "#fff",
          borderRadius: 12,
          boxShadow: "0 2px 8px #0001",
          display: "flex",
          alignItems: "flex-start",
          padding: 0,
        }}
      >
        <div
          style={{
            width: 300,
            background: "#fff",
            padding: 24,
            borderRight: "1px solid #eee",
            marginTop: 60,
            minHeight: 600,
          }}
        >
          <FilterBox title="Area (m²)">
            <Slider range min={15} max={40} value={area} onChange={setArea} />
          </FilterBox>

          <FilterBox title="Room Status">
            <Select value={status} onChange={setStatus} style={{ width: "100%" }}>
              <Option value="All">All</Option>
              <Option value="Available">Available</Option>
              <Option value="Occupied">Occupied</Option>
              <Option value="Maintenance">Maintenance</Option>
              <Option value="Inactive">Inactive</Option>
            </Select>
          </FilterBox>

          <FilterBox title="Bedrooms">
            <Slider range min={0} max={5} value={bedrooms} onChange={setBedrooms} />
          </FilterBox>

          <FilterBox title="Bathrooms">
            <Slider range min={0} max={5} value={bathrooms} onChange={setBathrooms} />
          </FilterBox>

          <FilterBox title="Price (VND)">
            <Slider
              range
              min={0}
              max={10000000}
              value={price}
              onChange={setPrice}
              tipFormatter={(v) => v.toLocaleString()}
            />
          </FilterBox>

          <FilterBox title="Has Asset">
            <Select value={hasAsset} onChange={setHasAsset} style={{ width: "100%" }}>
              <Option value="All">All</Option>
              <Option value="true">Có nội thất</Option>
              <Option value="false">Không có</Option>
            </Select>
          </FilterBox>

          <Button type="primary" block onClick={handleApplyFilter}>
            Apply Filter
          </Button>
        </div>

        <div
          style={{
            flex: 1,
            padding: 32,
            background: "#fff",
            borderRadius: "0 12px 12px 0",
            minHeight: 600,
          }}
        >
          <RoomList filter={appliedFilter} />
        </div>
      </div>
      <Footer />
    </div>
  );
}