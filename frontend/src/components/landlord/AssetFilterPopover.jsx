import React from "react";
import { Form, InputNumber, Select, Button, Space } from "antd";

const assetStatusOptions = [
  { label: "All Statuses", value: "" },
  { label: "Good", value: "Good" },
  { label: "Damaged", value: "Damaged" },
  { label: "Lost", value: "Lost" },
  { label: "Maintenance", value: "Maintenance" },
];

export default function AssetFilterPopover({ onFilter, onClose }) {
  const [form] = Form.useForm();

  const handleFinish = (values) => {
    // Đổi key 'status' thành 'assetStatus' nếu có
    const cleanedValues = Object.fromEntries(
      Object.entries(values).filter(([_, v]) => v != null && v !== "")
    );
    if (cleanedValues.status) {
      cleanedValues.assetStatus = cleanedValues.status;
      delete cleanedValues.status;
    }
    console.log("✅ Filter values to apply:", cleanedValues);

    // Truyền giá trị filter ra ngoài component cha
    onFilter(cleanedValues);

    // Đóng popover nếu có callback
    if (onClose) onClose();
  };

  return (
    <div style={{ width: 280 }}>
      <p style={{ marginBottom: 16, fontWeight: 500 }}>Advanced Filter</p>
      <Form form={form} onFinish={handleFinish} layout="vertical">
        <Form.Item name="status" label="Status">
          <Select
            placeholder="-- All --"
            options={assetStatusOptions}
            allowClear
          />
        </Form.Item>

        <Form.Item label="Quantity">
          <Space.Compact block>
            <Form.Item name="minQuantity" noStyle>
              <InputNumber style={{ width: "50%" }} placeholder="Min" min={0} />
            </Form.Item>
            <Form.Item name="maxQuantity" noStyle>
              <InputNumber style={{ width: "50%" }} placeholder="Max" min={0} />
            </Form.Item>
          </Space.Compact>
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
