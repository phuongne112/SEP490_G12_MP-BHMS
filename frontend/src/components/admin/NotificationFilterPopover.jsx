import React from "react";
import { Form, Select, DatePicker, Button } from "antd";

const { RangePicker } = DatePicker;

export default function NotificationFilterPopover({ onApply }) {
  const [form] = Form.useForm();
  const handleSubmit = () => {
    form.validateFields().then((values) => {
      onApply(values);
    });
  };

  return (
    <Form form={form} layout="vertical">
      <div style={{ marginBottom: 8, fontWeight: "bold" }}>Advanced Filter</div>
      <Form.Item name="dateRange" label="Date Range">
        <RangePicker />
      </Form.Item>
      <Form.Item name="role" label="Role" initialValue="All">
        <Select>
          <Select.Option value="All">All</Select.Option>
          <Select.Option value="Admin">Admin</Select.Option>
          <Select.Option value="Renter">Renter</Select.Option>
          <Select.Option value="Landlord">Landlord</Select.Option>
        </Select>
      </Form.Item>
      <Form.Item name="event" label="Event" initialValue="All">
        <Select>
          <Select.Option value="All">All</Select.Option>
          <Select.Option value="Login Performed">Login Performed</Select.Option>
          <Select.Option value="Archiving Request">
            Archiving Request
          </Select.Option>
          <Select.Option value="Policy Executed">Policy Executed</Select.Option>
        </Select>
      </Form.Item>
      <Button type="primary" onClick={handleSubmit} block>
        Apply Filter
      </Button>
    </Form>
  );
}
