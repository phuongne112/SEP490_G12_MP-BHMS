import React from "react";
import { Checkbox, Slider, Divider } from "antd";

export default function RoomFilter({ filters, onChange, style }) {
  const handleCheckboxChange = (category, value) => {
    const updated = {
      ...filters,
      [category]: filters[category].includes(value)
        ? filters[category].filter((v) => v !== value)
        : [...filters[category], value],
    };
    onChange(updated);
  };

  return (
    <div style={{ width: 280, ...style }}>
      <Checkbox
        checked={filters.service.includes("full")}
        onChange={() => handleCheckboxChange("service", "full")}
      >
        <strong>Full Service</strong>
        <div style={{ fontSize: 12, color: "#666" }}>
          Water, Internet, Cleaning
        </div>
      </Checkbox>

      <Divider style={{ margin: "12px 0" }} />

      <div>
        <strong>Area</strong>
        <Slider
          range
          min={15}
          max={50}
          value={filters.area}
          onChange={(value) => onChange({ ...filters, area: value })}
          tooltip={{ formatter: (val) => `${val} m²` }}
        />
      </div>

      <Divider style={{ margin: "12px 0" }} />

      <Checkbox
        checked={filters.asset.includes("full")}
        onChange={() => handleCheckboxChange("asset", "full")}
      >
        <strong>Full Asset</strong>
        <div style={{ fontSize: 12, color: "#666" }}>
          Fan, Bed, Wardrobe,...
        </div>
      </Checkbox>

      <Divider style={{ margin: "12px 0" }} />

      <div>
        <strong>Price</strong>
        <Slider
          range
          min={0}
          max={3000000}
          step={100000}
          value={filters.price}
          onChange={(value) => onChange({ ...filters, price: value })}
          tooltip={{ formatter: (val) => `${val.toLocaleString()} VND` }}
        />
      </div>

      <Divider style={{ margin: "12px 0" }} />

      <div>
        <strong>Building</strong>
        <div>
          <Checkbox
            checked={filters.building.includes("A")}
            onChange={() => handleCheckboxChange("building", "A")}
          >
            A
          </Checkbox>
          <br />
          <Checkbox
            checked={filters.building.includes("B")}
            onChange={() => handleCheckboxChange("building", "B")}
          >
            B
          </Checkbox>
        </div>
      </div>

      <Divider style={{ margin: "12px 0" }} />

      <div>
        <strong>Status</strong>
        <div>
          <Checkbox
            checked={filters.status.includes("available")}
            onChange={() => handleCheckboxChange("status", "available")}
          >
            Available ✅
          </Checkbox>
          <br />
          <Checkbox
            checked={filters.status.includes("pending")}
            onChange={() => handleCheckboxChange("status", "pending")}
          >
            Pending 🛠️
          </Checkbox>
          <br />
          <Checkbox
            checked={filters.status.includes("full")}
            onChange={() => handleCheckboxChange("status", "full")}
          >
            Full 🛑
          </Checkbox>
        </div>
      </div>
    </div>
  );
}
