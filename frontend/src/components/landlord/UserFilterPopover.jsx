import React, { useState } from "react";
import { Button, Select } from "antd";

export default function UserFilterPopover({ onFilter }) {
  const [isActive, setIsActive] = useState();
  // Có thể thêm filter role nếu cần

  const handleApply = () => {
    onFilter({ isActive });
  };

  return (
    <div style={{ minWidth: 200 }}>
      <div style={{ marginBottom: 8 }}>Status</div>
      <Select
        allowClear
        style={{ width: "100%", marginBottom: 12 }}
        placeholder="All"
        value={isActive}
        onChange={setIsActive}
        options={[
          { label: "Active", value: true },
          { label: "Inactive", value: false },
        ]}
      />
      <Button type="primary" block onClick={handleApply}>
        Apply
      </Button>
    </div>
  );
} 