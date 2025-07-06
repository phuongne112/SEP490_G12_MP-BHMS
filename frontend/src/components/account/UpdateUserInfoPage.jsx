import React, { useEffect, useState } from "react";
import {
  Modal,
  Form,
  Input,
  Button,
  DatePicker,
  message,
  Spin,
  Select,
  Popconfirm,
} from "antd";
import dayjs from "dayjs";
import {
  createPersonalInfo,
  getPersonalInfo,
  updatePersonalInfo,
} from "../../services/userApi";

export default function UpdateUserInfoModal({
  open,
  isCreate,
  onClose,
  onBackToInfoModal,
}) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    if (!open) return;

    if (isCreate) {
      form.resetFields();
      setInitialLoading(false);
    } else {
      setInitialLoading(true);
      getPersonalInfo()
        .then((res) => {
          const data = res?.data || res;
          form.setFieldsValue({
            fullName: data.fullName || "",
            phoneNumber: data.phoneNumber || "",
            phoneNumber2: data.phoneNumber2 || "",
            gender: data.gender || "",
            birthDate: data.birthDate ? dayjs(data.birthDate) : null,
            birthPlace: data.birthPlace || "",
            nationalID: data.nationalID || "",
            nationalIDIssuePlace: data.nationalIDIssuePlace || "",
            permanentAddress: data.permanentAddress || "",
          });
        })
        .catch(() => message.error("Không thể tải thông tin cá nhân."))
        .finally(() => setInitialLoading(false));
    }
  }, [open, isCreate]);

  const onFinish = async (values) => {
    const payload = {
      ...values,
      birthDate: values.birthDate ? values.birthDate.toISOString() : null,
    };

    try {
      setLoading(true);
      if (isCreate) {
        await createPersonalInfo(payload);
        message.success("Tạo thông tin cá nhân thành công!");
      } else {
        await updatePersonalInfo(payload);
        message.success("Cập nhật thông tin cá nhân thành công!");
      }
      onClose();
      onBackToInfoModal?.();
    } catch (err) {
      if (err.response?.data?.error === "VALIDATION_ERROR") {
        const fieldErrors = err.response.data.data;
        form.setFields(
          Object.entries(fieldErrors).map(([field, message]) => ({
            name: field,
            errors: [message],
          }))
        );
      } else {
        message.error(
          isCreate
            ? "Tạo thông tin cá nhân thất bại."
            : "Cập nhật thông tin cá nhân thất bại."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Cập nhật thông tin cá nhân"
      open={open}
      onCancel={onClose}
      footer={null}
      width={600}
    >
      {initialLoading ? (
        <Spin />
      ) : (
        <Form layout="vertical" form={form} onFinish={onFinish}>
          <Form.Item
            name="fullName"
            label="Họ và tên"
            rules={[{ required: true, message: "Vui lòng nhập họ và tên" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="phoneNumber" label="Số điện thoại">
            <Input />
          </Form.Item>
          <Form.Item name="phoneNumber2" label="Số điện thoại phụ">
            <Input />
          </Form.Item>
          <Form.Item name="gender" label="Giới tính">
            <Select placeholder="Chọn giới tính">
              <Select.Option value="Male">Nam</Select.Option>
              <Select.Option value="Female">Nữ</Select.Option>
              <Select.Option value="Other">Khác</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="birthDate" label="Ngày sinh">
            <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item name="birthPlace" label="Nơi sinh">
            <Input />
          </Form.Item>
          <Form.Item name="nationalID" label="CMND/CCCD">
            <Input />
          </Form.Item>
          <Form.Item name="nationalIDIssuePlace" label="Nơi cấp">
            <Input />
          </Form.Item>
          <Form.Item name="permanentAddress" label="Địa chỉ thường trú">
            <Input />
          </Form.Item>
          <Form.Item style={{ textAlign: "right" }}>
            <Button onClick={onClose} style={{ marginRight: 8 }}>
              Huỷ
            </Button>
            <Popconfirm
              title={isCreate ? "Xác nhận tạo mới" : "Xác nhận cập nhật"}
              description={
                isCreate
                  ? "Bạn có chắc chắn muốn tạo thông tin cá nhân này không?"
                  : "Bạn có chắc chắn muốn cập nhật thông tin cá nhân này không?"
              }
              onConfirm={() => form.submit()}
              okText="Đồng ý"
              cancelText="Huỷ"
            >
              <Button type="primary" loading={loading}>
                {isCreate ? "Tạo mới" : "Cập nhật"}
              </Button>
            </Popconfirm>
          </Form.Item>
        </Form>
      )}
    </Modal>
  );
}
