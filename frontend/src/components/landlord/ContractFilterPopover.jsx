import React, { useState } from "react";
import { Button, Select, DatePicker } from "antd";

const { Option } = Select;
const { RangePicker } = DatePicker;

const CONTRACT_STATUS = [
  { value: "ALL", label: "All" },
  { value: "PENDING", label: "Pending" },
  { value: "ACTIVE", label: "Active" },
  { value: "TERMINATED", label: "Terminated" },
  { value: "EXPIRED", label: "Expired" },
];

export default function ContractFilterPopover({ onApply }) {
  const [status, setStatus] = useState("ALL");
  const [dateRange, setDateRange] = useState(null);

  const handleApply = () => {
    onApply({ status, dateRange });
  };

  return (
    <div>
      <div style={{ marginBottom: 8, fontWeight: "bold" }}>Filter Contracts</div>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 13, marginBottom: 4 }}>Status</div>
        <Select
          value={status}
          onChange={setStatus}
          style={{ width: "100%" }}
        >
          {CONTRACT_STATUS.map((s) => (
            <Option key={s.value} value={s.value}>
              {s.label}
            </Option>
          ))}
        </Select>
      </div>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 13, marginBottom: 4 }}>Start Date Range</div>
        <RangePicker
          style={{ width: "100%" }}
          onChange={(dates) => setDateRange(dates)}
        />
      </div>
      <div style={{ textAlign: "right" }}>
        <Button type="primary" onClick={handleApply}>
          Apply
        </Button>
      </div>
    </div>
  );
} 