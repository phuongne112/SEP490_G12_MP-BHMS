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
        Bộ lọc nâng cao
      </Title>
      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
        {/* Filter by status */}
        <div>
          <div style={{ marginBottom: 4 }}>Trạng thái phòng</div>
          <Select
            style={{ width: "100%" }}
            placeholder="-- Tất cả --"
            value={status}
            onChange={(val) => setStatus(val)}
            allowClear
          >
            <Option value="Available">Còn trống</Option>
            <Option value="Occupied">Đã thuê</Option>
            <Option value="Maintenance">Bảo trì</Option>
            <Option value="Inactive">Ngừng hoạt động</Option>
          </Select>
        </div>

        {/* Filter by price */}
        <div>
          <div style={{ marginBottom: 4 }}>Khoảng giá (VND)</div>
          <InputNumber
            style={{ width: "45%", marginRight: "10%" }}
            placeholder="Tối thiểu"
            value={minPrice}
            onChange={(val) => setMinPrice(val)}
            min={0}
          />
          <InputNumber
            style={{ width: "45%" }}
            placeholder="Tối đa"
            value={maxPrice}
            onChange={(val) => setMaxPrice(val)}
            min={0}
          />
        </div>

        {/* Filter by Area */}
        <div>
          <div style={{ marginBottom: 4 }}>Diện tích (m²)</div>
          <InputNumber
            style={{ width: "45%", marginRight: "10%" }}
            placeholder="Tối thiểu"
            value={minArea}
            onChange={(val) => setMinArea(val)}
            min={0}
          />
          <InputNumber
            style={{ width: "45%" }}
            placeholder="Tối đa"
            value={maxArea}
            onChange={(val) => setMaxArea(val)}
            min={0}
          />
        </div>

        {/* Filter by Bedrooms */}
        <div>
          <div style={{ marginBottom: 4 }}>Số phòng ngủ</div>
          <InputNumber
            style={{ width: "45%", marginRight: "10%" }}
            placeholder="Tối thiểu"
            value={minBedrooms}
            onChange={(val) => setMinBedrooms(val)}
            min={0}
          />
          <InputNumber
            style={{ width: "45%" }}
            placeholder="Tối đa"
            value={maxBedrooms}
            onChange={(val) => setMaxBedrooms(val)}
            min={0}
          />
        </div>

        {/* Filter by Bathrooms */}
        <div>
          <div style={{ marginBottom: 4 }}>Số phòng tắm</div>
          <InputNumber
            style={{ width: "45%", marginRight: "10%" }}
            placeholder="Tối thiểu"
            value={minBathrooms}
            onChange={(val) => setMinBathrooms(val)}
            min={0}
          />
          <InputNumber
            style={{ width: "45%" }}
            placeholder="Tối đa"
            value={maxBathrooms}
            onChange={(val) => setMaxBathrooms(val)}
            min={0}
          />
        </div>
        
        {/* Filter by Has Asset */}
        <div>
          <div style={{ marginBottom: 4 }}>Có nội thất</div>
          <Select
            style={{ width: "100%" }}
            placeholder="-- Tất cả --"
            value={hasAsset}
            onChange={(val) => setHasAsset(val)}
            allowClear
          >
            <Option value="true">Có</Option>
            <Option value="false">Không</Option>
          </Select>
        </div>

        {/* Filter by Is Active */}
        <div>
          <div style={{ marginBottom: 4 }}>Trạng thái hoạt động</div>
          <Select
            style={{ width: "100%" }}
            placeholder="-- Tất cả --"
            value={isActive}
            onChange={(val) => setIsActive(val)}
            allowClear
          >
            <Option value="true">Đang hoạt động</Option>
            <Option value="false">Ngừng hoạt động</Option>
          </Select>
        </div>

        <Button type="primary" onClick={handleApply} block>
          Áp dụng
        </Button>
      </Space>
    </div>
  );
}
