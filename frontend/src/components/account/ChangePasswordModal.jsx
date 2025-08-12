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

      message.success(res?.data?.data?.message || "Đổi mật khẩu thành công!");

      logout(dispatch);
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
        message.error(res?.message || "Không thể đổi mật khẩu");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Đổi mật khẩu"
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
          label="Mật khẩu hiện tại"
          name="currentPassword"
          rules={[
            { required: true, message: "Vui lòng nhập mật khẩu hiện tại" },
          ]}
        >
          <Input.Password placeholder="Nhập mật khẩu hiện tại" />
        </Form.Item>

        <Form.Item
          label="Mật khẩu mới"
          name="newPassword"
          rules={[
            { required: true, message: "Vui lòng nhập mật khẩu mới" },
            { min: 6, message: "Mật khẩu phải có ít nhất 6 ký tự" },
          ]}
        >
          <Input.Password placeholder="Nhập mật khẩu mới" />
        </Form.Item>

        <Form.Item
          label="Xác nhận mật khẩu"
          name="confirmPassword"
          dependencies={["newPassword"]}
          rules={[
            { required: true, message: "Vui lòng xác nhận mật khẩu mới" },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue("newPassword") === value) {
                  return Promise.resolve();
                }
                return Promise.reject(
                  new Error("Mật khẩu xác nhận không khớp")
                );
              },
            }),
          ]}
        >
          <Input.Password placeholder="Nhập lại mật khẩu mới" />
        </Form.Item>

        <div style={{ textAlign: "right" }}>
          <Button onClick={onClose} style={{ marginRight: 8 }}>
            Hủy
          </Button>
          <Popconfirm
            title="Xác nhận đổi mật khẩu"
            description="Bạn có chắc chắn muốn đổi mật khẩu?"
            onConfirm={() => form.submit()}
            okText="Có"
                            cancelText="Hủy"
          >
            <Button type="primary" loading={loading}>
              Cập nhật
            </Button>
          </Popconfirm>
        </div>
      </Form>
    </Modal>
  );
}
