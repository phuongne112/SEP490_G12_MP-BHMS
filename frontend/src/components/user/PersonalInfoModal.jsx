import React, { useEffect, useState } from "react";
import { Modal, Form, Input, Button, DatePicker, Spin, message } from "antd";
import dayjs from "dayjs";
import { getPersonalInfo, updatePersonalInfo } from "../../services/userApi";

export default function PersonalInfoModal({ open, onClose }) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [data, setData] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await getPersonalInfo();
      setData(res);
      form.setFieldsValue({
        ...res,
        birthDate: res.birthDate ? dayjs(res.birthDate) : null,
      });
    } catch {
      message.error("Lỗi khi tải thông tin cá nhân");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) fetchData();
  }, [open]);

  const handleFinish = async (values) => {
    const payload = {
      ...values,
      birthDate: values.birthDate ? values.birthDate.format("YYYY-MM-DD") : null,
    };
    try {
      await updatePersonalInfo(payload);
      message.success("Cập nhật thành công");
      setEditing(false);
      fetchData();
    } catch {
      message.error("Cập nhật thất bại");
    }
  };

  return (
    <Modal
      title="Thông tin cá nhân"
      open={open}
      onCancel={() => {
        setEditing(false);
        onClose();
      }}
      footer={null}
      width={700}
    >
      {loading ? (
        <Spin />
      ) : editing ? (
        <Form
          form={form}
          layout="vertical"
          onFinish={handleFinish}
          initialValues={data}
        >
          <Form.Item name="fullName" label="Họ tên" rules={[{ required: true }]}> <Input /> </Form.Item>
          <Form.Item name="phoneNumber" label="SĐT chính"> <Input /> </Form.Item>
          <Form.Item name="gender" label="Giới tính"> <Input /> </Form.Item>
          <Form.Item name="birthDate" label="Ngày sinh"> <DatePicker style={{ width: "100%" }} /> </Form.Item>
          <Form.Item name="birthPlace" label="Nơi sinh"> <Input /> </Form.Item>
          <Form.Item name="nationalID" label="CCCD"> <Input /> </Form.Item>
          <Form.Item name="nationalIDIssuePlace" label="Nơi cấp CCCD"> <Input /> </Form.Item>
          <Form.Item name="permanentAddress" label="Địa chỉ thường trú"> <Input /> </Form.Item>
          <Button type="default" onClick={() => setEditing(false)} style={{ marginRight: 8 }}>Huỷ</Button>
          <Button type="primary" htmlType="submit">Lưu thay đổi</Button>
        </Form>
      ) : (
        <div>
          <p><strong>Họ tên:</strong> {data?.fullName}</p>
          <p><strong>SĐT chính:</strong> {data?.phoneNumber}</p>
          <p><strong>Giới tính:</strong> {data?.gender}</p>
          <p><strong>Ngày sinh:</strong> {data?.birthDate}</p>
          <p><strong>Nơi sinh:</strong> {data?.birthPlace}</p>
          <p><strong>CCCD:</strong> {data?.nationalID}</p>
          <p><strong>Nơi cấp:</strong> {data?.nationalIDIssuePlace}</p>
          <p><strong>Địa chỉ thường trú:</strong> {data?.permanentAddress}</p>
          <Button onClick={() => setEditing(true)}>Chỉnh sửa</Button>
        </div>
      )}
    </Modal>
  );
}
