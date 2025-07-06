import React, { useEffect, useState } from "react";
import { DatePicker, Select, Button, Spin } from "antd";
import { getAllRoles } from "../../services/roleApi";

const { RangePicker } = DatePicker;
const { Option } = Select;

export default function UserFilterPopover({ onApply }) {
  const [role, setRole] = useState("none");
  const [dateRange, setDateRange] = useState(null);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleApply = () => {
    onApply({ role, dateRange });
  };

  useEffect(() => {
    const fetchRoles = async () => {
      setLoading(true);
      try {
        const res = await getAllRoles();
        setRoles(res.result || []);
      } catch (err) {
        console.error("Không thể tải danh sách vai trò", err);
      } finally {
        setLoading(false);
      }
    };
    fetchRoles();
  }, []);

  return (
    <div>
      <div style={{ marginBottom: 8, fontWeight: "bold" }}>Bộ lọc nâng cao</div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 13, marginBottom: 4 }}>Ngày tạo</div>
        <RangePicker
          style={{ width: "100%" }}
          onChange={(dates) => setDateRange(dates)}
        />
      </div>

      <div>
        <div style={{ fontSize: 13, marginBottom: 4 }}>Vai trò</div>
        {loading ? (
          <Spin />
        ) : (
          <Select
            style={{ width: "100%" }}
            value={role}
            onChange={(val) => setRole(val)}
            placeholder="Chọn vai trò"
          >
            <Option value="none">-- Tất cả --</Option>
            <Option value="null">Người dùng chưa có vai trò</Option>
            {roles.map((r) => (
              <Option key={r.id} value={r.id}>
                {r.roleName}
              </Option>
            ))}
          </Select>
        )}
      </div>

      <div style={{ marginTop: 16, textAlign: "right" }}>
        <Button type="primary" onClick={handleApply}>
          Áp dụng
        </Button>
      </div>
    </div>
  );
}
