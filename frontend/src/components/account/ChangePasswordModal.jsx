import React, { useState, useEffect } from "react";
import { Modal, Form, Input, Button, message } from "antd";
import { changePassword } from "../../services/authService"; // bạn cần tạo API này

export default function ChangePasswordModal({ open, onClose }) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) form.resetFields();
  }, [open]);

  const handleChangePassword = async (values) => {
    setLoading(true);
    try {
      const res = await changePassword(values); // 👈 lưu lại response

      // ✅ In ra đúng message từ backend
      message.success(
        res?.data?.data?.message || "Password updated successfully!"
      );
      onClose();
    } catch (err) {
      message.error(err.response?.data?.message || "Failed to change password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Change Password"
      open={open}
      onCancel={onClose}
      footer={null}
      width={450}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleChangePassword}
        requiredMark={false}
      >
        <Form.Item
          label="Current Password"
          name="currentPassword"
          rules={[
            { required: true, message: "Please enter your current password" },
          ]}
        >
          <Input.Password placeholder="Current password" />
        </Form.Item>

        <Form.Item
          label="New Password"
          name="newPassword"
          rules={[
            { required: true, message: "Please enter a new password" },
            { min: 6, message: "Password must be at least 6 characters" },
          ]}
        >
          <Input.Password placeholder="New password" />
        </Form.Item>

        <Form.Item
          label="Confirm Password"
          name="confirmPassword"
          dependencies={["newPassword"]}
          rules={[
            { required: true, message: "Please confirm your new password" },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue("newPassword") === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error("Passwords do not match"));
              },
            }),
          ]}
        >
          <Input.Password placeholder="Re-enter new password" />
        </Form.Item>

        <div style={{ textAlign: "right" }}>
          <Button onClick={onClose} style={{ marginRight: 8 }}>
            Cancel
          </Button>
          <Button type="primary" htmlType="submit" loading={loading}>
            Update
          </Button>
        </div>
      </Form>
    </Modal>
  );
}
