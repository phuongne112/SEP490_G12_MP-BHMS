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
  message,
  Popconfirm,
} from "antd";
import { useDispatch } from "react-redux";
import {
  getCurrentUser,
  updateUserAccount,
  logout,
} from "../../services/authService";
import ChangePasswordModal from "./ChangePasswordModal";

export default function AccountModal({ open, onClose }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [originalUser, setOriginalUser] = useState(null);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [form] = Form.useForm();
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const dispatch = useDispatch();

  useEffect(() => {
    if (open) {
      setLoading(true);
      setEditing(false);
      getCurrentUser()
        .then((res) => {
          setUser(res);
          setOriginalUser(res); // lưu lại dữ liệu gốc để so sánh
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
    const isUnchanged =
      values.username === originalUser?.name &&
      values.email === originalUser?.email;

    if (isUnchanged) {
      message.info("No changes detected.");
      setEditing(false);
      return;
    }

    try {
      await updateUserAccount({
        username: values.username,
        email: values.email,
      });
      message.success("Account updated successfully!");

      logout(dispatch); // Chỉ logout nếu có thay đổi thực sự
    } catch (err) {
      const res = err?.response?.data;
      if (res?.data && typeof res.data === "object") {
        const fieldMap = {
          userName: "username",
          emailAddress: "email",
        };
        const fieldErrors = Object.entries(res.data).map(([field, msg]) => ({
          name: fieldMap[field] || field,
          errors: [msg],
        }));
        form.setFields(fieldErrors);
      } else {
        message.error(res?.message || "Failed to update account.");
      }
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
          <Form
            layout="vertical"
            form={form}
            onFinish={handleUpdate}
            autoComplete="off"
          >
            <Form.Item
              label="Username"
              name="username"
              rules={[
                { required: true, message: "Username is required" },
                { max: 20, message: "Username must be at most 20 characters" },
              ]}
            >
              <Input maxLength={20} />
            </Form.Item>

            <Form.Item
              label="Email"
              name="email"
              rules={[
                { required: true, message: "Email is required" },
                { type: "email", message: "Invalid email format" },
                { max: 50, message: "Email must be at most 50 characters" },
              ]}
            >
              <Input maxLength={50} />
            </Form.Item>

            <Space style={{ display: "flex", justifyContent: "end" }}>
              <Button onClick={() => setEditing(false)}>Cancel</Button>
              <Popconfirm
                title="Confirm update"
                description="Are you sure you want to save changes?"
                onConfirm={() => form.submit()}
                okText="Yes"
                cancelText="No"
              >
                <Button type="primary">Save</Button>
              </Popconfirm>
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
        onSuccess={() => {
          setShowPasswordModal(false);
          logout(dispatch); // Logout khi đổi mật khẩu
        }}
      />
    </>
  );
}
