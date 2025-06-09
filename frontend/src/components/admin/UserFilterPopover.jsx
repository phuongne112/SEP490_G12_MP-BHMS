import React, { useState } from "react";
import { DatePicker, Select, Button } from "antd";
const { RangePicker } = DatePicker;
const { Option } = Select;

export default function UserFilterPopover({ onApply }) {
  const [role, setRole] = useState("All");
  const [dateRange, setDateRange] = useState(null);

  const handleApply = () => {
    onApply({ role, dateRange }); // gửi lên cha
  };

  return (
    <div>
      <div style={{ marginBottom: 8, fontWeight: "bold" }}>Advanced Filter</div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 13, marginBottom: 4 }}>Create Date</div>
        <RangePicker
          style={{ width: "100%" }}
          onChange={(dates) => setDateRange(dates)}
        />
      </div>

      <div>
        <div style={{ fontSize: 13, marginBottom: 4 }}>Role</div>
        <Select
          style={{ width: "100%" }}
          defaultValue="All"
          onChange={(val) => setRole(val)}
        >
          <Option value="All">All</Option>
          <Option value="Landlord">Landlord</Option>
          <Option value="Renter">Renter</Option>
        </Select>
      </div>

      <div style={{ marginTop: 16, textAlign: "right" }}>
        <Button type="primary" onClick={handleApply}>
          Apply
        </Button>
      </div>
    </div>
  );
}
