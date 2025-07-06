import React from "react";
import { Select } from "antd";

const { Option } = Select;

export default function EntrySelect({ value, onChange }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ fontSize: 14 }}>Hiển thị</span>
      <Select value={value} onChange={onChange} style={{ width: 80 }}>
        {[5, 10, 15, 20].map((val) => (
          <Option key={val} value={val}>
            {val}
          </Option>
        ))}
      </Select>
      <span style={{ fontSize: 14 }}>mục</span>
    </div>
  );
}
