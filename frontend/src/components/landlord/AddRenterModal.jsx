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
      message.success('Add renter successfully!');
      form.resetFields();
      onSuccess();
    } catch (err) {
      if (err?.errorFields) return; // validation error
      message.error('Failed to add renter!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      title="Add New Renter"
      onCancel={() => { form.resetFields(); onCancel(); }}
      onOk={handleOk}
      confirmLoading={loading}
      okText="Add"
    >
      <Form form={form} layout="vertical">
        <Form.Item name="fullName" label="Full Name" rules={[{ required: true }]}> <Input /> </Form.Item>
        <Form.Item name="phoneNumber" label="Phone Number" rules={[{ required: true }]}> <Input /> </Form.Item>
        <Form.Item name="citizenId" label="Citizen ID Number"> <Input /> </Form.Item>
        <Form.Item name="dateOfBirth" label="Date of Birth"> <DatePicker style={{ width: '100%' }} /> </Form.Item>
        <Form.Item name="address" label="Address"> <Input /> </Form.Item>
      </Form>
    </Modal>
  );
} 