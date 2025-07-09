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
        <Option value="All">All</Option>
        <Option value="User">User</Option>
        <Option value="Role">Role</Option>
        <Option value="Notification">Notification</Option>
        <Option value="Permission">Permission</Option>
        <Option value="Room">Room</Option>
        <Option value="Renter">Renter</Option>
        <Option value="Bill">Bill</Option>
        <Option value="Service">Service</Option>
        <Option value="Contract">Contract</Option>
        <Option value="Ocr">OCR</Option>
        <Option value="Payment">Payment</Option>
        <Option value="Schedule">Schedule</Option>
        <Option value="RoomUser">RoomUser</Option>
        <Option value="Asset">Asset</Option>
        <Option value="ElectricReading">ElectricReading</Option>
        <Option value="AssetInventory">AssetInventory</Option>
        <Option value="ContractTemplate">ContractTemplate</Option>
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
