import React, { useState } from "react";
import { Button, InputNumber, Select, Space, Typography } from "antd";

const { Option } = Select;
const { Title } = Typography;

export default function RoomFilterPopover({ onFilter }) {
  const [status, setStatus] = useState();
  const [minPrice, setMinPrice] = useState();
  const [maxPrice, setMaxPrice] = useState();
  const [minArea, setMinArea] = useState();
  const [maxArea, setMaxArea] = useState();
  const [minBedrooms, setMinBedrooms] = useState();
  const [maxBedrooms, setMaxBedrooms] = useState();
  const [minBathrooms, setMinBathrooms] =useState();
  const [maxBathrooms, setMaxBathrooms] = useState();
  const [hasAsset, setHasAsset] = useState();
  const [isActive, setIsActive] = useState();

  const handleApply = () => {
    onFilter({
      status,
      priceRange: [minPrice, maxPrice],
      areaRange: [minArea, maxArea],
      bedroomsRange: [minBedrooms, maxBedrooms],
      bathroomsRange: [minBathrooms, maxBathrooms],
      hasAsset,
      isActive,
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
            <Option value="Occupied">Occupied</Option>
            <Option value="Maintenance">Maintenance</Option>
            <Option value="Inactive">Inactive</Option>
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

        {/* Filter by Area */}
        <div>
          <div style={{ marginBottom: 4 }}>Area (m²)</div>
          <InputNumber
            style={{ width: "45%", marginRight: "10%" }}
            placeholder="Min"
            value={minArea}
            onChange={(val) => setMinArea(val)}
            min={0}
          />
          <InputNumber
            style={{ width: "45%" }}
            placeholder="Max"
            value={maxArea}
            onChange={(val) => setMaxArea(val)}
            min={0}
          />
        </div>

        {/* Filter by Bedrooms */}
        <div>
          <div style={{ marginBottom: 4 }}>Bedrooms</div>
          <InputNumber
            style={{ width: "45%", marginRight: "10%" }}
            placeholder="Min"
            value={minBedrooms}
            onChange={(val) => setMinBedrooms(val)}
            min={0}
          />
          <InputNumber
            style={{ width: "45%" }}
            placeholder="Max"
            value={maxBedrooms}
            onChange={(val) => setMaxBedrooms(val)}
            min={0}
          />
        </div>

        {/* Filter by Bathrooms */}
        <div>
          <div style={{ marginBottom: 4 }}>Bathrooms</div>
          <InputNumber
            style={{ width: "45%", marginRight: "10%" }}
            placeholder="Min"
            value={minBathrooms}
            onChange={(val) => setMinBathrooms(val)}
            min={0}
          />
          <InputNumber
            style={{ width: "45%" }}
            placeholder="Max"
            value={maxBathrooms}
            onChange={(val) => setMaxBathrooms(val)}
            min={0}
          />
        </div>
        
        {/* Filter by Has Asset */}
        <div>
          <div style={{ marginBottom: 4 }}>Has Asset</div>
          <Select
            style={{ width: "100%" }}
            placeholder="-- All --"
            value={hasAsset}
            onChange={(val) => setHasAsset(val)}
            allowClear
          >
            <Option value="true">Yes</Option>
            <Option value="false">No</Option>
          </Select>
        </div>

        {/* Filter by Is Active */}
        <div>
          <div style={{ marginBottom: 4 }}>Active Status</div>
          <Select
            style={{ width: "100%" }}
            placeholder="-- All --"
            value={isActive}
            onChange={(val) => setIsActive(val)}
            allowClear
          >
            <Option value="true">Active</Option>
            <Option value="false">Inactive</Option>
          </Select>
        </div>

        <Button type="primary" onClick={handleApply} block>
          Apply
        </Button>
      </Space>
    </div>
  );
}
