import React, { useState, useEffect } from "react";
import { Modal, Form, Input, Button, message, Popconfirm } from "antd";
import { useDispatch } from "react-redux";
import { changePassword, logout } from "../../services/authService";

export default function ChangePasswordModal({ open, onClose }) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();

  useEffect(() => {
    if (!open) form.resetFields();
  }, [open]);

  const handleChangePassword = async (values) => {
    setLoading(true);
    try {
      const res = await changePassword(values);

      message.success(
        res?.data?.data?.message || "Password updated successfully!"
      );

      // ✅ Gọi logout: xóa Redux + localStorage + điều hướng
      logout(dispatch); // truyền dispatch nếu logout dùng Redux
    } catch (err) {
      const res = err?.response?.data;
      if (res?.data && typeof res.data === "object") {
        const fieldMap = {
          currentPassword: "currentPassword",
          newPassword: "newPassword",
          confirmPassword: "confirmPassword",
        };
        const fieldErrors = Object.entries(res.data).map(([field, msg]) => ({
          name: fieldMap[field] || field,
          errors: [msg],
        }));
        form.setFields(fieldErrors);
      } else {
        message.error(res?.message || "Failed to change password");
      }
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
          <Popconfirm
            title="Confirm password change"
            description="Are you sure you want to change your password?"
            onConfirm={() => form.submit()}
            okText="Yes"
            cancelText="No"
          >
            <Button type="primary" loading={loading}>
              Update
            </Button>
          </Popconfirm>
        </div>
      </Form>
    </Modal>
  );
}
