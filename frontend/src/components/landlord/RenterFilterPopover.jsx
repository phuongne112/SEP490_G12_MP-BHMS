import React, { useState } from "react";
import { Button, DatePicker, Select, Space, Typography, ConfigProvider } from "antd";
import dayjs from "dayjs";
import locale from "antd/es/locale/vi_VN";
import "dayjs/locale/vi";

// Đặt locale cho dayjs
dayjs.locale('vi');

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
    <ConfigProvider locale={locale}>
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
              format="DD/MM/YYYY"
              placeholder={["Từ ngày", "Đến ngày"]}
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
    </ConfigProvider>
  );
}
