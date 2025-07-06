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
      <div style={{ marginBottom: 8 }}>Trạng thái</div>
      <Select
        allowClear
        style={{ width: "100%", marginBottom: 12 }}
        placeholder="Tất cả"
        value={isActive}
        onChange={setIsActive}
        options={[
          { label: "Đang hoạt động", value: true },
          { label: "Ngừng hoạt động", value: false },
        ]}
      />
      <Button type="primary" block onClick={handleApply}>
        Áp dụng
      </Button>
    </div>
  );
} 