import React from 'react';
import { Form, InputNumber, Select, Button, Space } from 'antd';

const { Option } = Select;

export default function ServiceFilterPopover({ onFilter, onClose }) {
  const [form] = Form.useForm();

  const serviceTypeOptions = [
    { label: "Electricity", value: "ELECTRICITY" },
    { label: "Water", value: "WATER" },
    { label: "Other", value: "OTHER" },
  ];

  const handleFinish = (values) => {
    // Remove null or undefined values before passing
    const cleanedValues = Object.fromEntries(
      Object.entries(values).filter(([_, v]) => v != null && v !== '')
    );
    onFilter(cleanedValues);
    onClose(); // Close the popover after applying
  };

  return (
    <div style={{ width: 280 }}>
      <p style={{ marginBottom: 16, fontWeight: 500 }}>Advanced Filter</p>
      <Form form={form} onFinish={handleFinish} layout="vertical">
          <Form.Item label="Price Range (VND)">
              <Space.Compact block>
                  <Form.Item name="minPrice" noStyle>
                      <InputNumber style={{ width: '50%' }} placeholder="Min" min={0} />
                  </Form.Item>
                  <Form.Item name="maxPrice" noStyle>
                      <InputNumber style={{ width: '50%' }} placeholder="Max" min={0} />
                  </Form.Item>
              </Space.Compact>
          </Form.Item>
          <Form.Item name="serviceType" label="Service Type">
              <Select placeholder="-- All --" options={serviceTypeOptions} allowClear />
          </Form.Item>
          <Form.Item>
              <Button type="primary" htmlType="submit" block>
                  Apply
              </Button>
          </Form.Item>
      </Form>
    </div>
  );
} 