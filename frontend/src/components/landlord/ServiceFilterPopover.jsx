import React from 'react';
import { Form, InputNumber, Select, Button, Space } from 'antd';

const { Option } = Select;

export default function ServiceFilterPopover({ onFilter, onClose, onReset }) {
  const [form] = Form.useForm();

  const serviceTypeOptions = [
    { label: "Điện", value: "ELECTRICITY" },
    { label: "Nước", value: "WATER" },
    { label: "Khác", value: "OTHER" },
  ];

  const handleFinish = (values) => {
    // Remove null or undefined values before passing
    const cleanedValues = Object.fromEntries(
      Object.entries(values).filter(([_, v]) => v != null && v !== '')
    );
    onFilter(cleanedValues);
    onClose(); // Close the popover after applying
  };

  const handleReset = () => {
    form.resetFields();
    if (onReset) onReset();
    if (onClose) onClose();
  };

  return (
    <div style={{ width: 280 }}>
      <p style={{ marginBottom: 16, fontWeight: 500 }}>Bộ lọc nâng cao</p>
      <Form form={form} onFinish={handleFinish} layout="vertical">
          <Form.Item label="Khoảng giá (VND)">
              <Space.Compact block>
                  <Form.Item name="minPrice" noStyle>
                      <InputNumber style={{ width: '50%' }} placeholder="Tối thiểu" min={0} />
                  </Form.Item>
                  <Form.Item name="maxPrice" noStyle>
                      <InputNumber style={{ width: '50%' }} placeholder="Tối đa" min={0} />
                  </Form.Item>
              </Space.Compact>
          </Form.Item>
          <Form.Item name="serviceType" label="Loại dịch vụ">
              <Select placeholder="-- Tất cả --" options={serviceTypeOptions} allowClear />
          </Form.Item>
          <Form.Item>
              <Button type="primary" htmlType="submit" block style={{ marginBottom: 8 }}>
                  Áp dụng
              </Button>
              <Button htmlType="button" block onClick={handleReset}>
                  Xóa lọc
              </Button>
          </Form.Item>
      </Form>
    </div>
  );
} 