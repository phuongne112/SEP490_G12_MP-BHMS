import React, { useState } from "react";
import {
  Button,
  Form,
  Input,
  DatePicker,
  Row,
  Col,
  message,
  Switch,
} from "antd";
import { addRenter } from "../../services/renterApi";

export default function AddRenterForm() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleFinish = async (values) => {
    // Chỉ lấy các trường backend yêu cầu
    const data = {
      username: values.username,
      fullName: values.fullName,
      email: values.email,
      password: values.password,
      phone: values.phoneNumber,
      dateOfBirth: values.dateOfBirth ? values.dateOfBirth.format("YYYY-MM-DD") : undefined,
      citizenId: values.citizenId,
      address: values.address,
      isActive: values.isActive,
    };
    console.log("[DEBUG] Data gửi backend:", data);
    setLoading(true);
    try {
      const result = await addRenter(data);
      console.log("[DEBUG] Kết quả trả về:", result);
      message.success("Tạo tài khoản người thuê thành công!");
      form.resetFields();
      // Không gọi lại onSubmit để tránh double submit
    } catch (error) {
      const res = error.response?.data;
      if (res && res.data) {
        const errors = res.data;
        Object.entries(errors).forEach(([field, msg]) => {
          form.setFields([
            { name: field === "phone" ? "phoneNumber" : field, errors: [msg] },
          ]);
        });
        message.error("Vui lòng kiểm tra lại thông tin!");
      } else {
        message.error(res?.message || "Có lỗi xảy ra, vui lòng thử lại!");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <h2>Thêm người thuê mới</h2>
      <Form layout="vertical" form={form} onFinish={handleFinish} initialValues={{ isActive: true }}>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="Tên đăng nhập" name="username" rules={[
              { required: true, message: "Vui lòng nhập tên đăng nhập" },
              { min: 3, max: 50, message: "Tên đăng nhập phải từ 3-50 ký tự" },
              { pattern: /^[^@\s]+$/, message: "Tên đăng nhập không được là email." }
            ]}>
              <Input placeholder="Nhập tên đăng nhập" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Họ và tên" name="fullName" rules={[
              { required: true, message: "Vui lòng nhập họ và tên" },
              { min: 2, max: 100, message: "Họ và tên phải từ 2-100 ký tự" }
            ]}>
              <Input placeholder="Nhập họ và tên" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Email" name="email" rules={[
              { required: true, message: "Vui lòng nhập email" },
              { type: "email", message: "Email không hợp lệ" },
              { max: 100, message: "Email tối đa 100 ký tự" }
            ]}>
              <Input type="email" placeholder="Nhập email" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Mật khẩu" name="password" rules={[
              { required: true, message: "Vui lòng nhập mật khẩu" },
              { min: 6, max: 32, message: "Mật khẩu phải từ 6-32 ký tự" }
            ]}>
              <Input.Password placeholder="Nhập mật khẩu" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Số điện thoại" name="phoneNumber" rules={[
              { required: true, message: "Vui lòng nhập số điện thoại" },
              { message: "Số điện thoại không hợp lệ. Bắt đầu bằng 0, 10 số, đúng đầu số Việt Nam." }
            ]}>
              <Input placeholder="Nhập số điện thoại" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Ngày sinh" name="dateOfBirth" rules={[
              { required: true, message: "Vui lòng chọn ngày sinh" }
            ]}>
              <DatePicker style={{ width: '100%' }} placeholder="Chọn ngày sinh" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="CCCD/CMND" name="citizenId" rules={[
              { required: true, message: "Vui lòng nhập CCCD/CMND" },
              { pattern: /^\d{9,12}$/, message: "CCCD/CMND phải từ 9-12 số" }
            ]}>
              <Input placeholder="Nhập số CCCD/CMND" />
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item label="Địa chỉ thường trú" name="address" rules={[
              { required: true, message: "Vui lòng nhập địa chỉ thường trú" }
            ]}>
              <Input placeholder="Nhập địa chỉ thường trú" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Trạng thái hoạt động" name="isActive" valuePropName="checked">
              <Switch checkedChildren="Đang hoạt động" unCheckedChildren="Ngừng hoạt động" />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item style={{ textAlign: "right" }}>
          <Button type="primary" htmlType="submit" loading={loading}>
            Tạo tài khoản
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
}
