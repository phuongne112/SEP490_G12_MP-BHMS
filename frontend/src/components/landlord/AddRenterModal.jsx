import React, { useState } from 'react';
import { Modal, Form, Input, DatePicker, message } from 'antd';
import { createRenter } from '../../services/renterApi';

export default function AddRenterModal({ open, onCancel, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      await createRenter(values);
      message.success('Thêm người thuê thành công!');
      form.resetFields();
      onSuccess();
    } catch (err) {
      if (err?.errorFields) return; // validation error
      message.error('Thêm người thuê thất bại!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      title="Thêm người thuê mới"
      onCancel={() => { form.resetFields(); onCancel(); }}
      onOk={handleOk}
      confirmLoading={loading}
      okText="Thêm"
    >
      <Form form={form} layout="vertical">
        <Form.Item name="fullName" label="Họ và tên" rules={[{ required: true }]}> <Input /> </Form.Item>
        <Form.Item name="phoneNumber" label="Số điện thoại" rules={[{ required: true }]}> <Input /> </Form.Item>
        <Form.Item name="citizenId" label="CCCD/CMND"> <Input /> </Form.Item>
        <Form.Item name="dateOfBirth" label="Ngày sinh"> <DatePicker style={{ width: '100%' }} /> </Form.Item>
        <Form.Item name="address" label="Address"> <Input /> </Form.Item>
      </Form>
    </Modal>
  );
} 