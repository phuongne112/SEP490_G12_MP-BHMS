import React, { useEffect, useState } from "react";
import {
  Modal,
  Descriptions,
  Spin,
  Alert,
  Button,
  Form,
  Input,
  Space,
} from "antd";
import { getCurrentUser, updateUserAccount } from "../../services/authService";
import ChangePasswordModal from "./ChangePasswordModal";
import { message } from "antd";

export default function AccountModal({ open, onClose }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [form] = Form.useForm();
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  useEffect(() => {
    if (open) {
      setLoading(true);
      setEditing(false);
      getCurrentUser()
        .then((res) => {
          setUser(res);
          form.setFieldsValue({
            username: res.name,
            email: res.email,
          });
        })
        .catch(() => setError("Failed to load account information."))
        .finally(() => setLoading(false));
    }
  }, [open]);

  const handleUpdate = async (values) => {
    try {
      const res = await updateUserAccount({
        username: values.username,
        email: values.email,
      });
      message.success("Account updated successfully!");
      setEditing(false);

      // Load lại thông tin mới
      const updatedUser = await getCurrentUser();
      setUser(updatedUser);
    } catch (err) {
      message.error(
        err?.response?.data?.message || "Failed to update account."
      );
    }
  };

  return (
    <>
      <Modal
        title="Account Information"
        open={open}
        onCancel={onClose}
        footer={null}
        width={500}
      >
        {loading ? (
          <Spin />
        ) : error ? (
          <Alert type="error" message={error} />
        ) : editing ? (
          <Form layout="vertical" form={form} onFinish={handleUpdate}>
            <Form.Item
              label="Username"
              name="username"
              rules={[{ required: true, message: "Username is required" }]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              label="Email"
              name="email"
              rules={[{ type: "email", message: "Invalid email format" }]}
            >
              <Input />
            </Form.Item>
            <Space style={{ display: "flex", justifyContent: "end" }}>
              <Button onClick={() => setEditing(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit">
                Save
              </Button>
            </Space>
          </Form>
        ) : (
          <>
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="Username">
                {user?.name}
              </Descriptions.Item>
              <Descriptions.Item label="Email">{user?.email}</Descriptions.Item>
              <Descriptions.Item label="Role">
                {user?.role?.roleName}
              </Descriptions.Item>
            </Descriptions>
            <div style={{ textAlign: "right", marginTop: 16 }}>
              <Button
                style={{ marginRight: 8 }}
                onClick={() => setEditing(true)}
              >
                Edit Info
              </Button>
              <Button type="primary" onClick={() => setShowPasswordModal(true)}>
                Change Password
              </Button>
            </div>
          </>
        )}
      </Modal>

      <ChangePasswordModal
        open={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
      />
    </>
  );
}
