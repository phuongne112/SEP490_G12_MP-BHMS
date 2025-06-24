import React, { useState } from "react";
import { Form, Input, InputNumber, Button, message } from "antd";
import { createBill } from "../../services/billApi";
import { useNavigate } from "react-router-dom";

export default function LandlordBillCreatePage() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onFinish = async (values) => {
    setLoading(true);
    try {
      await createBill(values);
      message.success("Bill created successfully");
      navigate("/landlord/bills");
    } catch {
      message.error("Create bill failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <h2>Create Bill</h2>
      <Form layout="vertical" onFinish={onFinish}>
        <Form.Item name="roomNumber" label="Room Number" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="renterName" label="Renter Name" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="totalAmount" label="Total Amount" rules={[{ required: true }]}>
          <InputNumber min={0} style={{ width: "100%" }} />
        </Form.Item>
        {/* Thêm các trường khác nếu cần */}
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading}>Create</Button>
        </Form.Item>
      </Form>
    </div>
  );
} 