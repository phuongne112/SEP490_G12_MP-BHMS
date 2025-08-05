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
import { getRoleDisplayName } from "../../utils/roleUtils";

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
        .catch(() => setError("Không thể tải thông tin tài khoản."));
      // Nếu lỗi thì hiện thông báo tiếng Việt
      setLoading(false);
    }
  }, [open]);

  const handleUpdate = async (values) => {
    const isUnchanged =
      values.username === originalUser?.name &&
      values.email === originalUser?.email;

    if (isUnchanged) {
      message.info("Không có thay đổi nào được phát hiện.");
      setEditing(false);
      return;
    }

    try {
      await updateUserAccount({
        username: values.username,
        email: values.email,
      });
      message.success("Cập nhật tài khoản thành công!");

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
        message.error(res?.message || "Cập nhật tài khoản thất bại.");
      }
    }
  };

  return (
    <>
      <Modal
        title="Thông tin tài khoản"
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
              label="Tên người dùng"
              name="username"
              rules={[
                { required: true, message: "Vui lòng nhập tên người dùng" },
                { max: 20, message: "Tối đa 20 ký tự" },
              ]}
            >
              <Input maxLength={20} />
            </Form.Item>

            <Form.Item
              label="Email"
              name="email"
              rules={[
                { required: true, message: "Vui lòng nhập email" },
                { type: "email", message: "Email không đúng định dạng" },
                { max: 50, message: "Tối đa 50 ký tự" },
              ]}
            >
              <Input maxLength={50} />
            </Form.Item>

            <Space style={{ display: "flex", justifyContent: "end" }}>
              <Button onClick={() => setEditing(false)}>Huỷ</Button>
              <Popconfirm
                title="Xác nhận cập nhật"
                description="Bạn có chắc chắn muốn lưu thay đổi không?"
                onConfirm={() => form.submit()}
                okText="Đồng ý"
                cancelText="Huỷ"
              >
                <Button type="primary">Lưu</Button>
              </Popconfirm>
            </Space>
          </Form>
        ) : (
          <>
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="Tên người dùng">
                {user?.name}
              </Descriptions.Item>
              <Descriptions.Item label="Email">{user?.email}</Descriptions.Item>
              <Descriptions.Item label="Vai trò">
                {getRoleDisplayName(user?.role?.roleName)}
              </Descriptions.Item>
            </Descriptions>
            <div style={{ textAlign: "right", marginTop: 16 }}>
              <Button
                style={{ marginRight: 8 }}
                onClick={() => setEditing(true)}
              >
                Chỉnh sửa
              </Button>
              <Button type="primary" onClick={() => setShowPasswordModal(true)}>
                Đổi mật khẩu
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
