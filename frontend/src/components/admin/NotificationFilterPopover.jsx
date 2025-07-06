import React from "react";
import { Form, Select, DatePicker, Button } from "antd";

const { Option } = Select;
const { RangePicker } = DatePicker;

export default function NotificationFilterPopover({ onApply }) {
  const [form] = Form.useForm();

  const handleApply = () => {
    form.validateFields().then((values) => {
      onApply(values);
    });
  };

  return (
    <Form form={form} layout="vertical">
      <Form.Item label="Trạng thái" name="status" initialValue="All">
        <Select>
          <Option value="All">Tất cả</Option>
          <Option value="SENT">Chưa đọc</Option>
          <Option value="DELIVERED">Đã gửi</Option>
          <Option value="READ">Đã đọc</Option>
        </Select>
      </Form.Item>

      <Form.Item label="Loại thông báo" name="type" initialValue="All">
        <Select>
          <Option value="All">Tất cả</Option>
          <Option value="RENT_REMINDER">Nhắc thanh toán</Option>
          <Option value="MAINTENANCE">Bảo trì</Option>
          <Option value="BOOKING_STATUS">Trạng thái đặt chỗ</Option>
          <Option value="ANNOUNCEMENT">Thông báo chung</Option>
          <Option value="PAYMENT_SUCCESS">Thanh toán thành công</Option>
          <Option value="PAYMENT_FAILED">Thanh toán thất bại</Option>
          <Option value="CUSTOM">Tùy chỉnh</Option>
        </Select>
      </Form.Item>

      <Form.Item label="Khoảng ngày" name="dateRange">
        <RangePicker />
      </Form.Item>

      <Form.Item>
        <Button type="primary" block onClick={handleApply}>
          Áp dụng bộ lọc
        </Button>
      </Form.Item>
    </Form>
  );
}
