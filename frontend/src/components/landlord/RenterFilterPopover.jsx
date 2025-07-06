import React, { useState } from "react";
import { Button, DatePicker, Select, Space, Typography } from "antd";

const { RangePicker } = DatePicker;
const { Option } = Select;
const { Title } = Typography;

export default function RenterFilterPopover({ onFilter, roomOptions = [] }) {
  const [dateRange, setDateRange] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState();

  const handleApply = () => {
    onFilter({
      checkInDateRange: dateRange,
      room: selectedRoom,
    });
  };

  return (
    <div style={{ padding: 16, minWidth: 250 }}>
      <Title level={5} style={{ marginBottom: 12 }}>
        Bộ lọc nâng cao
      </Title>

      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
        <div>
          <div style={{ marginBottom: 4 }}>Ngày nhận phòng</div>
          <RangePicker
            style={{ width: "100%" }}
            value={dateRange}
            onChange={(val) => setDateRange(val)}
          />
        </div>

        <div>
          <div style={{ marginBottom: 4 }}>Phòng</div>
          <Select
            style={{ width: "100%" }}
            placeholder="-- Tất cả --"
            value={selectedRoom}
            onChange={(val) => setSelectedRoom(val)}
            allowClear
          >
            {roomOptions.map((room) => (
              <Option key={room} value={room}>
                {room}
              </Option>
            ))}
          </Select>
        </div>

        <Button type="primary" onClick={handleApply} block>
          Áp dụng
        </Button>
      </Space>
    </div>
  );
}
