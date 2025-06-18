import React, { useState } from "react";
import { Button, InputNumber, Select, Space, Typography } from "antd";

const { Option } = Select;
const { Title } = Typography;

export default function RoomFilterPopover({ onFilter }) {
  const [status, setStatus] = useState();
  const [minPrice, setMinPrice] = useState();
  const [maxPrice, setMaxPrice] = useState();

  const handleApply = () => {
    onFilter({
      status,
      priceRange: [minPrice, maxPrice],
    });
  };

  return (
    <div style={{ padding: 16, minWidth: 250 }}>
      <Title level={5} style={{ marginBottom: 12 }}>
        Advanced Filter
      </Title>
      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
        {/* Filter by status */}
        <div>
          <div style={{ marginBottom: 4 }}>Room Status</div>
          <Select
            style={{ width: "100%" }}
            placeholder="-- All --"
            value={status}
            onChange={(val) => setStatus(val)}
            allowClear
          >
            <Option value="Available">Available</Option>
            <Option value="Full">Full</Option>
          </Select>
        </div>

        {/* Filter by price */}
        <div>
          <div style={{ marginBottom: 4 }}>Price Range (VND)</div>
          <InputNumber
            style={{ width: "45%", marginRight: "10%" }}
            placeholder="Min"
            value={minPrice}
            onChange={(val) => setMinPrice(val)}
            min={0}
          />
          <InputNumber
            style={{ width: "45%" }}
            placeholder="Max"
            value={maxPrice}
            onChange={(val) => setMaxPrice(val)}
            min={0}
          />
        </div>

        <Button type="primary" onClick={handleApply} block>
          Apply
        </Button>
      </Space>
    </div>
  );
}
