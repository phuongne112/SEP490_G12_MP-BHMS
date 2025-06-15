// ✅ HomePage.jsx
import React, { useState } from "react";
import Footer from "../components/layout/Footer";
import Header from "../components/layout/Header";
import RoomList from "../components/home/RoomList";
import { Slider, Divider, Select, Button } from "antd";

const { Option } = Select;

export default function HomePage() {
  const [area, setArea] = useState([22, 27]);
  const [price, setPrice] = useState([0, 10000000]);
  const [status, setStatus] = useState("All");
  const [appliedFilter, setAppliedFilter] = useState("");

  // ✅ Filter DSL chuẩn - escape giá trị bằng dấu nháy đơn nếu cần
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
    if (status !== "All") {
      dsl.push(`roomStatus = '${status}'`); // ✅ đúng cú pháp
    }
    return dsl.join(" and ");
  };

  const handleApplyFilter = () => {
    const dsl = buildRoomFilter().trim();
    console.log("🔍 Applying filter:", dsl);
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
          minHeight: 600,
          padding: 0,
        }}
      >
        {/* Sidebar */}
        <div
          style={{
            width: 260,
            background: "#fff",
            padding: 24,
            borderRadius: "12px 0 0 12px",
            borderRight: "1px solid #eee",
            minHeight: 600,
            marginTop: 80,
          }}
        >
          <Divider style={{ margin: "12px 0" }} />
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Area (m²)</div>
          <Slider range min={15} max={40} value={area} onChange={setArea} style={{ marginBottom: 16 }} />

          <div style={{ fontWeight: 600, marginBottom: 8, marginTop: 30 }}>Room Status</div>
          <Select value={status} onChange={setStatus} style={{ width: "100%", marginBottom: 16 }}>
            <Option value="All">All</Option>
            <Option value="Available">Available</Option>
            <Option value="Occupied">Occupied</Option>
            <Option value="Maintenance">Maintenance</Option>
            <Option value="Inactive">Inactive</Option>
          </Select>

          <Divider style={{ margin: "12px 0" }} />
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Price (VND)</div>
          <Slider
            range
            min={0}
            max={10000000}
            value={price}
            onChange={setPrice}
            tipFormatter={(v) => v.toLocaleString()}
            style={{ marginBottom: 16 }}
          />

          <Divider style={{ margin: "12px 0" }} />
          <Button type="primary" block onClick={handleApplyFilter}>Apply Filter</Button>
        </div>

        {/* Main Content */}
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
