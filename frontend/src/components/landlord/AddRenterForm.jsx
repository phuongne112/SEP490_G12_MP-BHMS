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
      message.success("Renter account created successfully!");
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
        message.error("Please check your information!");
      } else {
        message.error(res?.message || "An error occurred, please try again!");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <h2>Add New Renter</h2>
      <Form layout="vertical" form={form} onFinish={handleFinish} initialValues={{ isActive: true }}>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="Username" name="username" rules={[
              { required: true, message: "Please enter username" },
              { min: 3, max: 50, message: "Username must be 3-50 characters" },
              { pattern: /^[A-Za-z0-9_]+$/, message: "Only letters, numbers, and underscores allowed. No spaces." },
              { pattern: /^[^@\s]+$/, message: "Username cannot be an email address." }
            ]}>
              <Input />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Full Name" name="fullName" rules={[
              { required: true, message: "Please enter full name" },
              { min: 2, max: 100, message: "Full name must be 2-100 characters" }
            ]}>
              <Input />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Email" name="email" rules={[
              { required: true, message: "Please enter email" },
              { type: "email", message: "Invalid email format" },
              { max: 100, message: "Email must be at most 100 characters" }
            ]}>
              <Input type="email" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Password" name="password" rules={[
              { required: true, message: "Please enter password" },
              { min: 6, max: 32, message: "Password must be 6-32 characters" }
            ]}>
              <Input.Password />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item 
              label="Phone Number" 
              name="phoneNumber" 
              rules={[
                { required: true, message: "Please enter phone number" },
                {
                  pattern: /^(03[2-9]|05[689]|07[06-9]|08[1-6|8|9]|09\d)\d{7}$/,
                  message: "Invalid phone number. Must start with 0 and have exactly 10 digits with a valid Vietnamese prefix."
                }
              ]}
            >
              <Input />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Date of Birth" name="dateOfBirth" rules={[
              { required: true, message: "Please select date of birth" }
            ]}>
              <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Citizen ID" name="citizenId" rules={[
              { required: true, message: "Please enter citizen ID" },
              { pattern: /^\d{9,12}$/, message: "Citizen ID must be 9-12 digits" }
            ]}>
              <Input />
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item label="Permanent Address" name="address" rules={[
              { required: true, message: "Please enter permanent address" },
              { min: 5, max: 255, message: "Address must be 5-255 characters" }
            ]}>
              <Input />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Active Status" name="isActive" valuePropName="checked">
              <Switch checkedChildren="Active" unCheckedChildren="Deactive" />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item style={{ textAlign: "right" }}>
          <Button type="primary" htmlType="submit" loading={loading}>
            Create Account
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
}
