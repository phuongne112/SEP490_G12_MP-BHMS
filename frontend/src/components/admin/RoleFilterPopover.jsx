import React, { useState } from "react";
import { Button, Select, DatePicker } from "antd";

const { Option } = Select;
const { RangePicker } = DatePicker;

export default function RoleFilterPopover({ onApply }) {
  const [status, setStatus] = useState("All");
  const [dateRange, setDateRange] = useState(null);

  const handleApply = () => {
    onApply({ status, dateRange });
  };

  return (
    <div>
      <div style={{ marginBottom: 8, fontWeight: "bold" }}>Lọc vai trò</div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 13, marginBottom: 4 }}>Ngày tạo</div>
        <RangePicker
          style={{ width: "100%" }}
          onChange={(dates) => setDateRange(dates)}
        />
      </div>

      <div style={{ textAlign: "right" }}>
        <Button type="primary" onClick={handleApply}>
          Áp dụng bộ lọc
        </Button>
      </div>
    </div>
  );
}
