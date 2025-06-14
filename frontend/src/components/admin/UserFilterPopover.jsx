import React, { useEffect, useState } from "react";
import { DatePicker, Select, Button, Spin } from "antd";
import { getAllRoles } from "../../services/roleApi";

const { RangePicker } = DatePicker;
const { Option } = Select;

export default function UserFilterPopover({ onApply }) {
  const [role, setRole] = useState("none"); // ✅ mặc định là "All"
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
        console.error("Failed to load roles", err);
      } finally {
        setLoading(false);
      }
    };
    fetchRoles();
  }, []);

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
        {loading ? (
          <Spin />
        ) : (
          <Select
            style={{ width: "100%" }}
            value={role}
            onChange={(val) => setRole(val)}
            placeholder="Select role"
          >
            <Option value="none">-- All --</Option> {/* Không filter theo role */}
            <Option value="null">User (No Role)</Option> {/* role IS NULL */}
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
          Apply
        </Button>
      </div>
    </div>
  );
}
