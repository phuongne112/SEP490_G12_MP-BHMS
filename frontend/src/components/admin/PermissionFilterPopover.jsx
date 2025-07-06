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
        Lọc quyền truy cập
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 13, marginBottom: 4 }}>Chức năng</div>
        <Select style={{ width: "100%" }} value={module} onChange={setModule}>
          <Option value="All">Tất cả</Option>
          <Option value="User">Người dùng</Option>
          <Option value="Role">Vai trò</Option>
          <Option value="Notification">Thông báo</Option>
          <Option value="Permission">Quyền</Option>
          <Option value="Room">Phòng</Option>
        </Select>
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 13, marginBottom: 4 }}>Phương thức</div>
        <Select style={{ width: "100%" }} value={method} onChange={setMethod}>
          <Option value="All">Tất cả</Option>
          <Option value="GET">GET (Lấy dữ liệu)</Option>
          <Option value="POST">POST (Tạo mới)</Option>
          <Option value="PUT">PUT (Cập nhật)</Option>
          <Option value="DELETE">DELETE (Xóa)</Option>
        </Select>
      </div>

      <div style={{ textAlign: "right" }}>
        <Button type="primary" onClick={handleApply}>
          Áp dụng bộ lọc
        </Button>
      </div>
    </div>
  );
}
