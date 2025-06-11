import React, { useState } from "react";
import Footer from "../components/layout/Footer";
import Header from "../components/layout/Header";
import RoomList from "../components/home/RoomList";
import { Slider, Divider, Checkbox, Button } from "antd";

export default function HomePage() {
  const [area, setArea] = useState([22, 27]);
  const [price, setPrice] = useState([0, 10000000]);

  const [appliedFilter, setAppliedFilter] = useState(""); // Chỉ filter khi user bấm nút

  // Hàm build filter DSL từ các filter hiện tại
  const buildRoomFilter = () => {
    const areaFilter = area ? `area >: ${area[0]} and area <: ${area[1]}` : "";
    const priceFilter = price
      ? `pricePerMonth >: ${price[0]} and pricePerMonth <: ${price[1]}`
      : "";
    return [priceFilter, areaFilter].filter(Boolean).join(" and ");
  };

  const handleApplyFilter = () => {
    setAppliedFilter(buildRoomFilter());
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
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 16 }}>Full Service</div>
          <div style={{ color: "#888", fontSize: 13, marginBottom: 8 }}>
            Water, Internet, Cleaning
          </div>
          <Divider style={{ margin: "12px 0" }} />
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Area</div>
          <Slider
            range
            min={15}
            max={40}
            value={area}
            onChange={setArea}
            style={{ marginBottom: 16 }}
          />
          <Divider style={{ margin: "12px 0" }} />
          <Checkbox checked style={{ marginBottom: 8 }}>
            Full Asset
          </Checkbox>
          <div style={{ color: "#888", fontSize: 13, marginBottom: 8 }}>
            Fan, Bed, Wardrobe, ...
          </div>
          <Divider style={{ margin: "12px 0" }} />
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Price</div>
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

          <Button type="primary" block onClick={handleApplyFilter}>
            Lọc
          </Button>
        </div>

        {/* Main content */}
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
