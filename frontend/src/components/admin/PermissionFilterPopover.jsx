import React, { useState } from "react";
import { Button, Select } from "antd";

const { Option } = Select;

export default function PermissionFilterPopover({ onApply }) {
  const [module, setModule] = useState("All");
  const [method, setMethod] = useState("All");

  const handleApply = () => {
    onApply({ module, method });
  };
  return (
    <div>
      <div style={{ marginBottom: 8, fontWeight: "bold" }}>
        Filters Permissions
      </div>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 13, marginBottom: 4 }}>Module</div>
        <Select style={{ width: "100%" }} value={module} onChange={setModule}>
          <Option value="All">All</Option>
          <Option value="Admin">Admin</Option>
          <Option value="User">User</Option>
          <Option value="Renter">Renter</Option>
          <Option value="Landlord">Landlord</Option>
        </Select>
      </div>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 13, marginBottom: 4 }}>Method</div>
        <Select style={{ width: "100%" }} value={method} onChange={setMethod}>
          <Option value="All">All</Option>
          <Option value="GET">GET</Option>
          <Option value="POST">POST</Option>
          <Option value="PUT">PUT</Option>
          <Option value="DELETE">DELETE</Option>
        </Select>
      </div>
      <div style={{ textAlign: "right" }}>
        <Button type="primary" onClick={handleApply}>
          Apply
        </Button>
      </div>
    </div>
  );
}
