import React from "react";
import { Form, Select, DatePicker, Button, Space } from "antd";

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
      <Form.Item label="Status" name="status" initialValue="All">
        <Select>
          <Option value="All">All</Option>
          <Option value="SENT">Sent</Option>
          <Option value="DELIVERED">Delivered</Option>
          <Option value="READ">Read</Option>
        </Select>
      </Form.Item>

      <Form.Item label="Type" name="type" initialValue="All">
        <Select>
          <Option value="All">All</Option>
          <Option value="RENT_REMINDER">Rent Reminder</Option>
          <Option value="MAINTENANCE">Maintenance</Option>
          <Option value="BOOKING_STATUS">Booking Status</Option>
          <Option value="ANNOUNCEMENT">Announcement</Option>
          <Option value="PAYMENT_SUCCESS">Payment Success</Option>
          <Option value="PAYMENT_FAILED">Payment Failed</Option>
          <Option value="CUSTOM">Custom</Option>
        </Select>
      </Form.Item>

      <Form.Item label="Date Range" name="dateRange">
        <RangePicker />
      </Form.Item>

      <Form.Item>
        <Button type="primary" block onClick={handleApply}>
          Apply Filter
        </Button>
      </Form.Item>
    </Form>
  );
}
